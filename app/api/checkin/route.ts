export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { appendCheckin, resolveQrTipo, CheckInPayload } from '@/lib/googleSheets';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body: CheckInPayload = await request.json();

    if (!body.nome || !body.cognome || !body.email || !body.scuola || !body.dataOra || !body.decodedText) {
      return Response.json({ error: 'Dati mancanti.' }, { status: 400 });
    }

    const tipo = resolveQrTipo(body.decodedText);
    if (!tipo) {
      return Response.json({ error: 'QR code non riconosciuto.' }, { status: 400 });
    }

    // Write to Google Sheets (1 retry on transient failure)
    try {
      await appendCheckin(body, tipo);
    } catch (firstErr) {
      console.error('[checkin] First attempt failed, retrying:', firstErr);
      await appendCheckin(body, tipo);
    }

    // Write to Supabase attendances (non-blocking — does not fail the request)
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const eventId = process.env.CURRENT_EVENT_ID;
        if (eventId) {
          await supabase.from('attendances').insert({
            user_id: user.id,
            event_id: eventId,
            type: tipo === 'Entrata' ? 'ingresso' : 'uscita',
          });
        }
      }
    } catch (supaErr) {
      console.error('[checkin] Supabase attendances write failed:', supaErr);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[checkin] Sheets write failed:', err);
    return Response.json(
      { error: 'Errore di sincronizzazione con Google Sheets.' },
      { status: 500 }
    );
  }
}
