export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isAdmin } from '@/lib/admin';

type AttendanceRow = {
  type: string;
  scanned_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    school: string;
  } | {
    first_name: string;
    last_name: string;
    email: string;
    school: string;
  }[];
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!isAdmin(user.email)) return new Response('Forbidden', { status: 403 });

  const eventId = new URL(request.url).searchParams.get('event_id');
  if (!eventId) return new Response('event_id required', { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from('attendances')
    .select('type, scanned_at, profiles!inner(first_name, last_name, email, school)')
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: true });

  if (error) {
    console.error('[csv]', error);
    return new Response('Internal Server Error', { status: 500 });
  }

  const rows = [
    'Nome,Cognome,Email,Scuola,Tipo,Data e Ora',
    ...(data as unknown as AttendanceRow[]).map(row => {
      const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const dt = new Date(row.scanned_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
      return [p.first_name, p.last_name, p.email, p.school, row.type, dt]
        .map(v => `"${(v ?? '').replace(/"/g, '""')}"`)
        .join(',');
    }),
  ].join('\r\n');

  return new Response('﻿' + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="presenze-${eventId}.csv"`,
    },
  });
}
