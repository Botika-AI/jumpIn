export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!isAdmin(user.email)) return new Response('Forbidden', { status: 403 });

  const type = new URL(request.url).searchParams.get('type');
  if (type !== 'ingresso' && type !== 'uscita') {
    return new Response('Bad Request: type must be ingresso or uscita', { status: 400 });
  }

  const value = type === 'ingresso'
    ? process.env.ENTRANCE_QR_VALUE
    : process.env.EXIT_QR_VALUE;

  if (!value) return new Response('QR value not configured', { status: 500 });

  const png = await QRCode.toBuffer(value, { type: 'png', width: 400, margin: 2 });

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="qr-${type}.png"`,
      'Cache-Control': 'no-store',
    },
  });
}
