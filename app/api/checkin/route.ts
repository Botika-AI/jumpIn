export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { appendCheckin, resolveQrTipo, CheckInPayload } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body: CheckInPayload = await request.json();

    // Validate required fields
    if (!body.nome || !body.cognome || !body.email || !body.scuola || !body.dataOra || !body.decodedText) {
      return Response.json({ error: 'Dati mancanti.' }, { status: 400 });
    }

    // Reject unrecognised QR codes
    const tipo = resolveQrTipo(body.decodedText);
    if (!tipo) {
      return Response.json({ error: 'QR code non riconosciuto.' }, { status: 400 });
    }

    // 1 immediate retry on transient failure
    try {
      await appendCheckin(body, tipo);
    } catch (firstErr) {
      console.error('[checkin] First attempt failed, retrying:', firstErr);
      await appendCheckin(body, tipo); // throws on second failure — caught below
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
