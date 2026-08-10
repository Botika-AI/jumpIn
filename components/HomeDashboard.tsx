import React, { useState, useEffect } from 'react';
import { CalendarDays, MapPin, Users, X, Info, Briefcase } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface Evento {
  id: string;
  name: string;
  breve_descrizione: string | null;
  descrizione: string | null;
  event_date: string;
  event_end: string | null;
  location: string | null;
  tags: string[];
  max_partecipanti: number | null;
}

interface Iscrizione {
  event_id: string;
  stato: string;
}

function fmtDateRange(start: string, end: string | null) {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (!e || end === start) return s.toLocaleDateString('it-IT', { ...opts, year: 'numeric' });
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()}-${e.getDate()} ${e.toLocaleDateString('it-IT', { month: 'short' })} ${e.getFullYear()}`;
  return `${s.toLocaleDateString('it-IT', opts)} – ${e.toLocaleDateString('it-IT', { ...opts, year: 'numeric' })}`;
}

function fmtDateFull(start: string, end: string | null) {
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  if (!end || end === start) return s.toLocaleDateString('it-IT', opts);
  const e = new Date(end);
  return `${s.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} – ${e.toLocaleDateString('it-IT', opts)}`;
}

const MOCK_UPCOMING = [
  { id: 'robotica', title: 'Robotica Lab', when: 'Domani, 14:00', iconBg: 'bg-orange-100 text-orange-500', isCalendar: true },
  { id: 'career',   title: 'Career Day',   when: '5 Nov, 10:00',  iconBg: 'bg-blue-100 text-blue-500',   isCalendar: false },
];

interface Props {
  user: UserProfile;
  onNavigate: (section: string) => void;
  onOpenEvent?: (eventId: string) => void;
}

export const HomeDashboard: React.FC<Props> = ({ user, onNavigate, onOpenEvent }) => {
  const [eventi, setEventi]         = useState<Evento[]>([]);
  const [iscrizioni, setIscrizioni] = useState<Iscrizione[]>([]);
  const [confirmExp, setConfirmExp] = useState<Evento | null>(null);
  const [toast, setToast]           = useState<string | null>(null);

  useEffect(() => {
    supabase.from('events').select('id,name,breve_descrizione,descrizione,event_date,event_end,location,tags,max_partecipanti')
      .eq('stato', 'pubblicato').order('event_date', { ascending: true })
      .then(({ data }) => setEventi((data ?? []).map((e: any) => ({ ...e, tags: e.tags ?? [] }))));

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      supabase.from('iscrizioni_eventi').select('event_id, stato').eq('user_id', u.id)
        .then(({ data }) => setIscrizioni((data ?? []) as Iscrizione[]));
    });
  }, []);

  const handleConfirm = async () => {
    if (!confirmExp) return;
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { error } = await supabase.from('iscrizioni_eventi')
      .insert({ event_id: confirmExp.id, user_id: u.id, stato: 'in_attesa' });
    if (!error) {
      setIscrizioni(prev => [...prev, { event_id: confirmExp.id, stato: 'in_attesa' }]);
      setToast(confirmExp.name);
    }
    setConfirmExp(null);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="min-h-full">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
          <Info size={18} className="text-teal-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-gray-700 flex-1 leading-relaxed">
            Iscrizione Confermata! Potrai trovare l'evento nella sezione{' '}
            <button
              onClick={() => { setToast(null); onNavigate('eventi'); }}
              className="text-orange-500 font-bold underline underline-offset-2"
            >
              I Miei Eventi
            </button>
          </p>
          <button onClick={() => setToast(null)} className="text-gray-300 hover:text-gray-500 shrink-0 -mt-0.5">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Sticky header: logo + banner */}
      <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-6 pb-4">
        <div className="max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="JumpIn" className="h-16 w-auto" />
          </div>
          <div className="bg-orange-500 rounded-2xl p-5">
        <h1 className="text-2xl font-bold font-montserrat text-white mb-1">
          Ciao, {user.first_name}! 👋
        </h1>
        <p className="text-orange-100 text-sm mb-4 leading-relaxed">
          Completa il tuo profilo per sbloccare nuove esperienze
        </p>
        <button
          onClick={() => onNavigate('profilo')}
          className="bg-white text-orange-500 font-bold text-sm px-5 py-2 rounded-xl hover:bg-orange-50 transition-colors"
        >
          Vai al Profilo
        </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-4">

      {/* Esperienze in evidenza */}
      <h2 className="text-base font-bold font-montserrat text-gray-900 mb-3">Esperienze in evidenza</h2>
      <div className="space-y-3 mb-6">
        {eventi.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
            <p className="text-sm text-gray-400">Nessuna esperienza disponibile al momento</p>
          </div>
        ) : eventi.map(ev => {
          const isc = iscrizioni.find(i => i.event_id === ev.id);
          const isAccettata = isc?.stato === 'accettata';
          const isAttesa    = isc?.stato === 'in_attesa';
          const isIscritto  = isAccettata || isAttesa;
          const endDate = ev.event_end ? new Date(ev.event_end) : new Date(ev.event_date);
          endDate.setHours(23, 59, 59, 999);
          const iscrizioniAperte = endDate >= new Date();
          return (
            <div key={ev.id} onClick={() => onOpenEvent?.(ev.id)} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer active:bg-gray-50 transition-colors">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="font-bold text-gray-900 text-sm font-montserrat leading-snug flex-1">
                  {ev.name}
                </h3>
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {iscrizioniAperte ? 'Aperte' : 'Chiuse'}
                </span>
              </div>
              {/* Description */}
              <p className="text-xs text-gray-500 mb-2 leading-relaxed line-clamp-2">
                {ev.breve_descrizione || ev.descrizione || ''}
              </p>
              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-gray-400 font-medium mb-2.5 flex-wrap">
                <span className="flex items-center gap-1"><CalendarDays size={12} />{fmtDateRange(ev.event_date, ev.event_end)}</span>
                {ev.location && <span className="flex items-center gap-1"><MapPin size={12} />{ev.location}</span>}
                {ev.max_partecipanti && <span className="flex items-center gap-1"><Users size={12} />{ev.max_partecipanti} posti</span>}
              </div>
              {/* Footer row: tags + action */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {ev.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500 border border-orange-100">
                      {tag}
                    </span>
                  ))}
                </div>
                {isAccettata && !iscrizioniAperte ? (
                  <span className="text-xs font-bold text-gray-400 shrink-0">Concluso</span>
                ) : isIscritto ? (
                  <span className="text-xs font-bold text-green-600 shrink-0">
                    {isAccettata ? 'Iscritto ✓' : 'In attesa…'}
                  </span>
                ) : !iscrizioniAperte ? (
                  <span className="text-xs font-bold text-gray-400 shrink-0">Concluso</span>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmExp(ev); }}
                    className="shrink-0 px-4 py-1.5 rounded-xl btn-primary-liquid text-xs font-bold"
                  >
                    Partecipa
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Da non perdere + I tuoi progressi — 2 colonne */}
      <div className="grid grid-cols-2 gap-3 mb-4">

        {/* Da non perdere */}
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold font-montserrat text-gray-900">Da non perdere</h2>
            <button className="text-[10px] font-bold text-orange-500">Tutti</button>
          </div>
          <div className="flex flex-col gap-2.5">
            {MOCK_UPCOMING.map(ev => (
              <div key={ev.id} className="flex items-center gap-2.5">
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${ev.iconBg}`}>
                  {ev.isCalendar ? <CalendarDays size={15} /> : <Briefcase size={15} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 leading-tight truncate">{ev.title}</p>
                  <p className="text-[10px] text-gray-400">{ev.when}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* I tuoi progressi */}
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex flex-col">
          <h2 className="text-xs font-bold font-montserrat text-gray-900 mb-3">I tuoi progressi</h2>
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between text-[10px] font-medium text-gray-500 mb-1.5">
                <span>Badge ottenuti</span>
                <span className="font-bold text-gray-900">3/10</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900 rounded-full" style={{ width: '30%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-medium text-gray-500 mb-1.5">
                <span>Eventi completati</span>
                <span className="font-bold text-gray-900">5/12</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900 rounded-full" style={{ width: '42%' }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation modal */}
      {confirmExp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold font-montserrat text-gray-900 pr-2">
                Conferma partecipazione
              </h3>
              <button onClick={() => setConfirmExp(null)} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Sei sicuro di voler partecipare a "{confirmExp.name}"?
            </p>
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center gap-2.5 text-sm text-gray-500">
                <CalendarDays size={16} className="text-gray-400 shrink-0" />
                <span>{fmtDateFull(confirmExp.event_date, confirmExp.event_end)}</span>
              </div>
              {confirmExp.location && (
                <div className="flex items-center gap-2.5 text-sm text-gray-500">
                  <MapPin size={16} className="text-gray-400 shrink-0" />
                  <span>{confirmExp.location}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleConfirm} className="flex-1 py-3 rounded-2xl btn-primary-liquid font-bold text-sm">
                Conferma
              </button>
              <button onClick={() => setConfirmExp(null)} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-600 hover:border-gray-300 transition-colors">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
