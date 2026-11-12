import React, { useState, useEffect, useRef } from 'react';
import { CalendarDays, MapPin, Users, X, Info, Globe, Sparkles } from 'lucide-react';
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
  modalita: string | null;
  tags: string[];
  max_partecipanti: number | null;
}

interface Iscrizione {
  event_id: string;
  stato: string;
}

const SECTION_ESPERIENZE  = 'esperienze_evidenza';
const SECTION_NON_PERDERE = 'da_non_perdere';
const SECTION_PROGRESSI   = 'progressi';
const DEFAULT_SECTION_ORDER = [SECTION_ESPERIENZE, SECTION_NON_PERDERE, SECTION_PROGRESSI];

function fmtDateRange(start: string, end: string | null) {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (!e || end === start) return s.toLocaleDateString('it-IT', { ...opts, year: 'numeric' });
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()}-${e.getDate()} ${e.toLocaleDateString('it-IT', { month: 'short' })} ${e.getFullYear()}`;
  return `${s.toLocaleDateString('it-IT', opts)} – ${e.toLocaleDateString('it-IT', { ...opts, year: 'numeric' })}`;
}

function extractCity(location: string | null): string | null {
  if (!location) return null;
  return location.split(',')[0].trim();
}

function fmtDateFull(start: string, end: string | null) {
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  if (!end || end === start) return s.toLocaleDateString('it-IT', opts);
  const e = new Date(end);
  return `${s.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} – ${e.toLocaleDateString('it-IT', opts)}`;
}

function relativeOrDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'Oggi';
  if (diffDays === 1) return 'Domani';
  return target.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

interface Props {
  user: UserProfile;
  onNavigate: (section: string) => void;
  onOpenEvent?: (eventId: string) => void;
}

export const HomeDashboard: React.FC<Props> = ({ user, onNavigate, onOpenEvent }) => {
  const [sectionOrder, setSectionOrder]         = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [evidenzaEventi, setEvidenzaEventi]     = useState<Evento[]>([]);
  const [nonPerdereEventi, setNonPerdereEventi] = useState<Evento[]>([]);
  const [iscrizioni, setIscrizioni]             = useState<Iscrizione[]>([]);
  const [acceptedCounts, setAcceptedCounts]     = useState<Record<string, number>>({});
  const [confirmExp, setConfirmExp]             = useState<Evento | null>(null);
  const [toast, setToast]                       = useState<string | null>(null);
  const [scrolled, setScrolled]                 = useState(false);
  const [badgeCount, setBadgeCount]             = useState(0);
  const [eventiCompletati, setEventiCompletati] = useState(0);
  const sentinelRef                             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.contains(el)) setScrolled(target.scrollTop > 0);
    };
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true } as EventListenerOptions);
  }, []);

  useEffect(() => {
    supabase.from('homepage_sections').select('id, ordine').order('ordine', { ascending: true })
      .then(({ data }) => {
        if (data && data.length) setSectionOrder(data.map((r: any) => r.id));
      });

    supabase
      .from('homepage_evidenza')
      .select('ordine, events(id,name,breve_descrizione,descrizione,event_date,event_end,location,modalita,tags,max_partecipanti,stato)')
      .order('ordine', { ascending: true })
      .then(({ data }) => {
        const evs = (data ?? [])
          .map((r: any) => r.events)
          .filter((e: any) => e && e.stato === 'pubblicato')
          .map((e: any) => ({ ...e, tags: e.tags ?? [] }));
        setEvidenzaEventi(evs as Evento[]);
      });

    const today = new Date().toISOString().split('T')[0];
    supabase.from('events').select('id,name,breve_descrizione,descrizione,event_date,event_end,location,modalita,tags,max_partecipanti')
      .eq('stato', 'pubblicato').gte('event_date', today)
      .order('event_date', { ascending: true }).limit(2)
      .then(({ data }) => setNonPerdereEventi((data ?? []).map((e: any) => ({ ...e, tags: e.tags ?? [] }))));

    supabase.from('iscrizioni_eventi').select('event_id').eq('stato', 'accettata')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        for (const row of (data ?? []) as { event_id: string }[]) {
          counts[row.event_id] = (counts[row.event_id] ?? 0) + 1;
        }
        setAcceptedCounts(counts);
      });

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      supabase.from('iscrizioni_eventi').select('event_id, stato').eq('user_id', u.id)
        .then(({ data }) => setIscrizioni((data ?? []) as Iscrizione[]));

      supabase.from('badge_assegnazioni').select('id', { count: 'exact', head: true }).eq('user_id', u.id)
        .then(({ count }) => setBadgeCount(count ?? 0));

      supabase.from('attendances').select('event_id, type').eq('user_id', u.id)
        .then(({ data }) => {
          const tipiPerEvento = new Map<string, Set<string>>();
          for (const a of (data ?? []) as { event_id: string; type: string }[]) {
            if (!tipiPerEvento.has(a.event_id)) tipiPerEvento.set(a.event_id, new Set());
            tipiPerEvento.get(a.event_id)!.add(a.type);
          }
          let completate = 0;
          for (const tipi of tipiPerEvento.values()) {
            if (tipi.has('ingresso') && tipi.has('uscita')) completate++;
          }
          setEventiCompletati(completate);
        });
    });
  }, []);

  const handleConfirm = async () => {
    if (!confirmExp) return;
    if (confirmExp.max_partecipanti != null && (acceptedCounts[confirmExp.id] ?? 0) >= confirmExp.max_partecipanti) {
      setConfirmExp(null);
      return;
    }
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

  const esperienzeBlock = (
    <div key={SECTION_ESPERIENZE}>
      <h2 className="text-base font-bold font-montserrat text-gray-900 mb-3">Esperienze in evidenza</h2>
      <div className="space-y-3 mb-6">
        {evidenzaEventi.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
            <p className="text-sm text-gray-400">Nessuna esperienza in evidenza al momento</p>
          </div>
        ) : evidenzaEventi.map(ev => {
          const isc = iscrizioni.find(i => i.event_id === ev.id);
          const isAccettata = isc?.stato === 'accettata';
          const isAttesa    = isc?.stato === 'in_attesa';
          const isRifiutata = isc?.stato === 'rifiutata';
          const isIscritto  = isAccettata || isAttesa;
          const endDate = ev.event_end ? new Date(ev.event_end) : new Date(ev.event_date);
          endDate.setHours(23, 59, 59, 999);
          const iscrizioniAperte = endDate >= new Date();
          const isFull = ev.max_partecipanti != null && (acceptedCounts[ev.id] ?? 0) >= ev.max_partecipanti;
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
                {(extractCity(ev.location) || ev.modalita) && (
                  <span className="flex items-center gap-1">
                    {extractCity(ev.location) ? <MapPin size={12} /> : <Globe size={12} />}
                    {[extractCity(ev.location), ev.modalita].filter(Boolean).join(' · ')}
                  </span>
                )}
                {ev.max_partecipanti && <span className="flex items-center gap-1"><Users size={12} />{acceptedCounts[ev.id] ?? 0}/{ev.max_partecipanti} posti</span>}
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
                {isRifiutata ? (
                  <span className="text-xs font-bold text-red-500 shrink-0">Rifiutato</span>
                ) : isAccettata && !iscrizioniAperte ? (
                  <span className="text-xs font-bold text-gray-400 shrink-0">Concluso</span>
                ) : isIscritto ? (
                  <span className="text-xs font-bold text-green-600 shrink-0">
                    {isAccettata ? 'Iscritto ✓' : 'In attesa…'}
                  </span>
                ) : !iscrizioniAperte ? (
                  <span className="text-xs font-bold text-gray-400 shrink-0">Concluso</span>
                ) : isFull ? (
                  <span className="text-xs font-bold text-gray-400 shrink-0">Posti esauriti</span>
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
    </div>
  );

  const nonPerdereBlock = (
    <div key={SECTION_NON_PERDERE} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold font-montserrat text-gray-900">Da non perdere</h2>
        <button onClick={() => onNavigate('esperienze')} className="text-[10px] font-bold text-orange-500">Tutti</button>
      </div>
      {nonPerdereEventi.length === 0 ? (
        <p className="text-[11px] text-gray-400">Nessuna esperienza in programma a breve</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {nonPerdereEventi.map((ev, i) => {
            const isOrange = i % 2 === 0;
            return (
              <div key={ev.id} onClick={() => onOpenEvent?.(ev.id)}
                className="flex items-center gap-2.5 cursor-pointer active:opacity-70 transition-opacity">
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isOrange ? 'bg-orange-100 text-orange-500' : 'bg-sky-100 text-sky-500'}`}>
                  {isOrange ? <CalendarDays size={15} /> : <Sparkles size={15} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{ev.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{relativeOrDate(ev.event_date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const progressiBlock = (
    <div key={SECTION_PROGRESSI} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex flex-col">
      <h2 className="text-xs font-bold font-montserrat text-gray-900 mb-3">I tuoi progressi</h2>
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex justify-between text-[10px] font-medium text-gray-500 mb-1.5">
            <span>Badge ottenuti</span>
            <span className="font-bold text-gray-900">{badgeCount}/5</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.min(100, (badgeCount / 5) * 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-medium text-gray-500 mb-1.5">
            <span>Eventi completati</span>
            <span className="font-bold text-gray-900">{eventiCompletati}/3</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.min(100, (eventiCompletati / 3) * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );

  const blocksByKey: Record<string, React.ReactNode> = {
    [SECTION_ESPERIENZE]: esperienzeBlock,
    [SECTION_NON_PERDERE]: nonPerdereBlock,
    [SECTION_PROGRESSI]: progressiBlock,
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
      <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-6 pb-4 relative">
        <div className="max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="JumpIn" className="h-16 w-auto" />
          </div>
          <div className="bg-orange-500 rounded-2xl p-5">
        <h1 className="text-2xl font-bold font-montserrat text-white mb-1">
          Ciao, {user.first_name}! 👋
        </h1>
        <p className="text-orange-100 text-sm mb-4 leading-relaxed">
          {user.profile_completed_at
            ? "Hai completato il tuo profilo, pronto a fare Jump'In!!"
            : 'Completa il tuo profilo per sbloccare nuove esperienze'}
        </p>
        <button
          onClick={() => onNavigate('profilo')}
          className="bg-white text-orange-500 font-bold text-sm px-5 py-2 rounded-xl hover:bg-orange-50 transition-colors"
        >
          Vai al Profilo
        </button>
          </div>
        </div>
        {scrolled && (
          <div className="absolute left-0 right-0 bottom-0 translate-y-full h-6 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />
        )}
      </div>

      <div className="max-w-md mx-auto px-4 pb-4">
      <div ref={sentinelRef} className="h-px" />

      {/* Slot 1: sezione principale, a piena larghezza */}
      {blocksByKey[sectionOrder[0] ?? SECTION_ESPERIENZE]}

      {/* Slot 2 e 3: le altre due sezioni, affiancate */}
      <div className="grid grid-cols-[3fr_2fr] gap-3 mb-4">
        {blocksByKey[sectionOrder[1] ?? SECTION_NON_PERDERE]}
        {blocksByKey[sectionOrder[2] ?? SECTION_PROGRESSI]}
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
