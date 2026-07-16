import React, { useState, useEffect } from 'react';
import { CalendarDays, MapPin, Users, ChevronRight, Compass } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface EventoIscritto {
  id: string;
  name: string;
  event_date: string;
  event_end: string | null;
  location: string | null;
  cover_url: string | null;
  tipo: string | null;
  max_partecipanti: number | null;
  stato: string;
}

const GRADIENTS = [
  'from-orange-400 to-orange-600',
  'from-violet-500 to-purple-600',
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-pink-400 to-rose-600',
  'from-amber-400 to-orange-500',
];

function gradientForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[h];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateRange(start: string, end: string | null) {
  if (!end || end === start) return fmtDate(start);
  const s = new Date(start); const e = new Date(end);
  const mon = e.toLocaleDateString('it-IT', { month: 'short' });
  const yr = e.getFullYear();
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()}-${e.getDate()} ${mon} ${yr}`;
  return `${s.getDate()} ${s.toLocaleDateString('it-IT', { month: 'short' })} – ${e.getDate()} ${mon} ${yr}`;
}

interface Props {
  user: UserProfile;
  onNavigate: (section: string) => void;
}

export const IMieiPage: React.FC<Props> = ({ user, onNavigate }) => {
  const [eventi, setEventi] = useState<EventoIscritto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('iscrizioni_eventi')
      .select('stato, eventi(id, name, event_date, event_end, location, cover_url, tipo, max_partecipanti)')
      .eq('user_id', user.id)
      .neq('stato', 'rifiutata')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []).map((r: any) => ({
          ...r.eventi,
          stato: r.stato,
        })).filter(Boolean);
        setEventi(rows);
        setLoading(false);
      });
  }, [user.id]);

  const statoLabel = (stato: string) =>
    stato === 'accettata' ? 'Confermato' : 'In attesa';

  const statoStyle = (stato: string) =>
    stato === 'accettata'
      ? 'bg-green-50 text-green-600'
      : 'bg-orange-50 text-orange-500';

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-4 pb-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold font-montserrat text-gray-900">I Miei</h1>
          <p className="text-xs text-gray-400 mt-0.5">Le esperienze a cui sei iscritto</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          </div>
        ) : eventi.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Compass size={28} className="text-gray-400" />
            </div>
            <p className="font-bold font-montserrat text-gray-700">Nessuna iscrizione</p>
            <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
              Esplora le esperienze disponibili e iscriviti a quelle che ti interessano.
            </p>
            <button
              onClick={() => onNavigate('esperienze')}
              className="mt-2 px-5 py-2.5 rounded-2xl btn-primary-liquid text-sm font-bold"
            >
              Scopri esperienze
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {eventi.map(ev => {
              const gradient = gradientForId(ev.id);
              return (
                <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex">
                  {/* Cover laterale */}
                  <div className="w-20 shrink-0">
                    {ev.cover_url
                      ? <img src={ev.cover_url} alt={ev.name} className="w-full h-full object-cover" />
                      : <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-bold font-montserrat text-gray-900 text-sm leading-snug line-clamp-2 flex-1">
                        {ev.name}
                      </h3>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${statoStyle(ev.stato)}`}>
                        {statoLabel(ev.stato)}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-400 font-medium">
                      <div className="flex items-center gap-1">
                        <CalendarDays size={11} />
                        {fmtDateRange(ev.event_date, ev.event_end)}
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={11} />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                      {ev.max_partecipanti && (
                        <div className="flex items-center gap-1">
                          <Users size={11} />
                          {ev.max_partecipanti} partecipanti
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center pr-3">
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
