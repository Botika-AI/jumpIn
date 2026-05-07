import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  if (!isAdmin(user.email)) {
    return (
      <main className="min-h-screen mesh-bg flex items-center justify-center p-6">
        <div className="liquid-glass p-8 text-center max-w-sm w-full">
          <h1 className="text-2xl font-montserrat font-bold text-orange-900 mb-2">Accesso negato</h1>
          <p className="text-orange-800/70">Non sei autorizzato a visualizzare questa pagina.</p>
        </div>
      </main>
    );
  }

  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_date, location')
    .order('event_date', { ascending: false });

  return (
    <main className="min-h-screen mesh-bg p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-montserrat font-bold text-orange-900">Dashboard Admin</h1>

        <section className="liquid-glass p-6">
          <h2 className="text-xl font-montserrat font-semibold text-orange-900 mb-5">QR Code Evento</h2>
          <div className="grid grid-cols-2 gap-8">
            {(['ingresso', 'uscita'] as const).map(type => (
              <div key={type} className="flex flex-col items-center gap-3">
                <p className="font-semibold text-orange-800 capitalize">{type}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/admin/api/qr?type=${type}`}
                  alt={`QR ${type}`}
                  className="w-40 h-40 rounded-xl border border-orange-100"
                />
                <a
                  href={`/admin/api/qr?type=${type}`}
                  download={`qr-${type}.png`}
                  className="text-sm text-orange-600 hover:text-orange-800 underline transition-colors"
                >
                  Scarica PNG
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="liquid-glass p-6">
          <h2 className="text-xl font-montserrat font-semibold text-orange-900 mb-4">Presenze per Evento</h2>
          {!events || events.length === 0 ? (
            <p className="text-orange-800/60">Nessun evento trovato.</p>
          ) : (
            <ul className="divide-y divide-orange-100">
              {events.map(event => (
                <li key={event.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-orange-900">{event.name}</p>
                    <p className="text-sm text-orange-700/70">{event.event_date} · {event.location}</p>
                  </div>
                  <a
                    href={`/admin/api/csv?event_id=${event.id}`}
                    className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold transition-colors border border-orange-200"
                  >
                    Scarica CSV
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
