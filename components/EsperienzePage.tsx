import React, { useState, useEffect, useRef } from 'react';
import { Search, CalendarDays, MapPin, Users, ChevronLeft, CheckCircle2, X, BookOpen, SlidersHorizontal } from 'lucide-react';
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
  tipo: string | null;
  cover_url: string | null;
  modalita: string | null;
  cosa_impari: string[];
  requisiti: string | null;
  form_esterno: string | null;
  max_partecipanti: number | null;
}

interface Iscrizione {
  event_id: string;
  stato: string;
}

const GRADIENTS = [
  'from-orange-400 to-orange-600',
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-600',
  'from-pink-400 to-rose-500',
  'from-teal-400 to-teal-600',
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
  const s = new Date(start);
  const e = new Date(end);
  const sDay = s.getDate();
  const eDay = e.getDate();
  const mon  = e.toLocaleDateString('it-IT', { month: 'short' });
  const yr   = e.getFullYear();
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${sDay}-${eDay} ${mon} ${yr}`;
  const sMon = s.toLocaleDateString('it-IT', { month: 'short' });
  return `${sDay} ${sMon} – ${eDay} ${mon} ${yr}`;
}

// ── Card ──────────────────────────────────────────────────────────────────────
const EventoCard: React.FC<{
  ev: Evento;
  iscrizione: Iscrizione | undefined;
  onDetail: () => void;
  onEnroll: () => void;
}> = ({ ev, iscrizione, onDetail, onEnroll }) => {
  const isAttesa    = iscrizione?.stato === 'in_attesa';
  const isAccettata = iscrizione?.stato === 'accettata';
  const isRifiutata = iscrizione?.stato === 'rifiutata';
  const isIscritto  = isAttesa || isAccettata;

  const badgeLabel = isAccettata ? 'Confermato' : isAttesa ? 'In attesa' : isRifiutata ? 'Rifiutato' : null;
  const badgeStyle = isAccettata ? 'bg-green-50 text-green-600' : isAttesa ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Titolo + badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-gray-900 text-base font-montserrat leading-snug flex-1">{ev.name}</h3>
        {badgeLabel && (
          <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${badgeStyle}`}>{badgeLabel}</span>
        )}
      </div>

      {/* Descrizione */}
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
        {ev.breve_descrizione || ev.descrizione || ''}
      </p>

      {/* Tags */}
      {ev.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ev.tags.slice(0, 3).map(t => (
            <span key={t} className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-400">{t}</span>
          ))}
        </div>
      )}

      {/* Data + location + partecipanti */}
      <div className="flex items-center gap-2.5 text-xs text-gray-400 font-medium mb-4 flex-nowrap">
        <span className="flex items-center gap-1"><CalendarDays size={12} />{fmtDateRange(ev.event_date, ev.event_end)}</span>
        {ev.location && <span className="flex items-center gap-1"><MapPin size={12} />{ev.location}</span>}
        {ev.max_partecipanti && <span className="flex items-center gap-1"><Users size={12} />{ev.max_partecipanti}</span>}
      </div>

      {/* Bottoni */}
      <div className="flex items-center gap-2">
        {isRifiutata ? (
          <span className="flex-1 py-2.5 text-sm font-semibold text-red-500 text-center">Rifiutato</span>
        ) : isAccettata ? (
          <span className="flex-1 py-2.5 text-sm font-semibold text-gray-900 text-center">Iscritto</span>
        ) : isAttesa ? (
          <span className="flex-1 py-2.5 text-sm font-semibold text-gray-400 text-center">In attesa di conferma</span>
        ) : (
          <button onClick={onEnroll} className="flex-1 py-2.5 rounded-xl btn-primary-liquid text-sm font-bold">
            Partecipa
          </button>
        )}
        <button onClick={onDetail} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-300 transition-colors">
          Dettagli
        </button>
      </div>
    </div>
  );
};

// ── Dettaglio ─────────────────────────────────────────────────────────────────
const EventoDetail: React.FC<{
  ev: Evento;
  iscrizione: Iscrizione | undefined;
  onEnroll: () => void;
  onCancel: () => void;
  onBack: () => void;
}> = ({ ev, iscrizione, onEnroll, onCancel, onBack }) => {
  const [tab, setTab] = useState<'dettagli' | 'materiali'>('dettagli');
  const [materiali, setMateriali] = useState<{ id: string; titolo: string; tipo: string; url: string }[]>([]);

  useEffect(() => {
    supabase.from('materiali_eventi').select('*').eq('event_id', ev.id).order('created_at')
      .then(({ data }) => setMateriali((data ?? []) as any[]));
  }, [ev.id]);

  const gradient = gradientForId(ev.id);
  const isIscritto = !!iscrizione && iscrizione.stato !== 'rifiutata';

  return (
    <div className="max-w-md mx-auto flex flex-col min-h-full">

      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-xs text-gray-400 font-medium">
        <button onClick={onBack} className="flex items-center gap-1 text-orange-500 font-bold">
          <ChevronLeft size={14} /> Esperienze
        </button>
        <span>›</span>
        <span className="text-gray-500 truncate">{ev.name}</span>
      </div>

      <div className="relative mx-4 rounded-2xl overflow-hidden h-44">
        {ev.cover_url
          ? <img src={ev.cover_url} alt={ev.name} className="w-full h-full object-cover" />
          : <div className={`bg-gradient-to-br ${gradient} w-full h-full`} />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end px-4 pb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="font-bold font-montserrat text-white text-lg leading-snug flex-1">{ev.name}</h2>
            {isIscritto && (
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${
                iscrizione?.stato === 'accettata' ? 'bg-green-500/70 text-white' : 'bg-orange-500/70 text-white'
              }`}>
                {iscrizione?.stato === 'accettata' ? 'Confermato' : 'In attesa'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/80 text-xs font-medium">
            <span className="flex items-center gap-1"><CalendarDays size={11} />{fmtDateRange(ev.event_date, ev.event_end)}</span>
            {ev.location && <span className="flex items-center gap-1"><MapPin size={11} />{ev.location}</span>}
            {ev.max_partecipanti && <span className="flex items-center gap-1"><Users size={11} />{ev.max_partecipanti} partecipanti</span>}
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-100 mx-4 mt-4">
        {(['dettagli', 'materiali'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-bold capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent'
            }`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 py-5 space-y-5">
        {tab === 'dettagli' && (
          <>
            {ev.descrizione && (
              <div>
                <h3 className="font-bold font-montserrat text-gray-900 mb-2">Descrizione</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{ev.descrizione}</p>
              </div>
            )}
            {ev.cosa_impari?.length > 0 && (
              <div>
                <h3 className="font-bold font-montserrat text-gray-900 mb-3">Cosa porterai a casa</h3>
                <ul className="space-y-2.5">
                  {ev.cosa_impari.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-2">Requisiti</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {ev.requisiti || 'Nessun requisito specifico.'}
              </p>
            </div>
          </>
        )}
        {tab === 'materiali' && (
          materiali.length > 0 ? (
            <div className="space-y-3">
              {materiali.map(m => (
                <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                    <BookOpen size={14} className="text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{m.titolo}</p>
                    <p className="text-xs text-gray-400">{m.tipo === 'link' ? 'Link esterno' : 'File'}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <BookOpen size={24} className="text-gray-400" />
              </div>
              <p className="font-bold font-montserrat text-gray-700">
                {isIscritto ? 'Nessun materiale disponibile' : 'Materiali non ancora disponibili'}
              </p>
              <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
                {isIscritto
                  ? "I materiali saranno caricati qualche giorno prima dell'evento."
                  : 'Le risorse sono visibili solo ai partecipanti.'}
              </p>
            </div>
          )
        )}
      </div>

      <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex items-center gap-3">
        {isIscritto ? (
          <>
            <button onClick={onCancel} className="text-sm font-bold text-red-400 hover:text-red-500 transition-colors">
              Cancella Iscrizione
            </button>
            <button onClick={onBack} className="ml-auto text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
              Indietro
            </button>
          </>
        ) : (
          <>
            <button onClick={onBack} className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-600 hover:border-gray-300 transition-all">
              Indietro
            </button>
            {ev.form_esterno ? (
              <a href={ev.form_esterno} target="_blank" rel="noopener noreferrer"
                className="flex-1 py-3.5 rounded-2xl btn-primary-liquid font-bold text-sm text-center">
                Partecipa
              </a>
            ) : (
              <button onClick={onEnroll} className="flex-1 py-3.5 rounded-2xl btn-primary-liquid font-bold text-sm">
                Partecipa
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Pagina principale ─────────────────────────────────────────────────────────
interface EsperienzePageProps {
  onDetailChange?: (isDetail: boolean) => void;
}

export const EsperienzePage: React.FC<EsperienzePageProps> = ({ onDetailChange }) => {
  const [eventi, setEventi]             = useState<Evento[]>([]);
  const [iscrizioni, setIscrizioni]     = useState<Iscrizione[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedEv, setSelectedEv]     = useState<Evento | null>(null);
  const [search, setSearch]             = useState('');
  const [confirmCancel, setConfirmCancel] = useState<Evento | null>(null);
  const [toast, setToast]               = useState<string | null>(null);
  const [scrolled, setScrolled]         = useState(false);
  const sentinelRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('events').select('*').eq('stato', 'pubblicato').order('event_date', { ascending: true })
      .then(({ data }) => {
        setEventi((data ?? []).map((e: any) => ({ ...e, tags: e.tags ?? [], cosa_impari: e.cosa_impari ?? [] })));
        setLoading(false);
      });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('iscrizioni_eventi').select('event_id, stato').eq('user_id', user.id)
        .then(({ data }) => setIscrizioni((data ?? []) as Iscrizione[]));

      const channel = supabase
        .channel('iscrizioni-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'iscrizioni_eventi',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          supabase.from('iscrizioni_eventi').select('event_id, stato').eq('user_id', user.id)
            .then(({ data }) => setIscrizioni((data ?? []) as Iscrizione[]));
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, []);

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

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const openDetail = (ev: Evento) => { setSelectedEv(ev); onDetailChange?.(true); };
  const closeDetail = () => { setSelectedEv(null); onDetailChange?.(false); };

  const handleEnroll = async (ev: Evento) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('iscrizioni_eventi')
      .insert({ event_id: ev.id, user_id: user.id, stato: 'in_attesa' });
    if (!error) {
      setIscrizioni(prev => [...prev, { event_id: ev.id, stato: 'in_attesa' }]);
      showToast('La tua richiesta di partecipazione è stata inviata');
    }
  };

  const handleCancel = async (ev: Evento) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('iscrizioni_eventi').delete().eq('event_id', ev.id).eq('user_id', user.id);
    setIscrizioni(prev => prev.filter(i => i.event_id !== ev.id));
    setConfirmCancel(null);
    closeDetail();
    showToast('Iscrizione cancellata');
  };

  const filtered = eventi.filter(ev =>
    !search ||
    ev.name.toLowerCase().includes(search.toLowerCase()) ||
    (ev.tags ?? []).some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-full">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={16} className="text-green-500 shrink-0" />
          <p className="text-xs font-semibold text-gray-700 flex-1 leading-relaxed">{toast}</p>
          <button onClick={() => setToast(null)} className="text-gray-300 hover:text-gray-500 shrink-0"><X size={14} /></button>
        </div>
      )}

      {selectedEv ? (
        <EventoDetail
          ev={selectedEv}
          iscrizione={iscrizioni.find(i => i.event_id === selectedEv.id)}
          onEnroll={() => handleEnroll(selectedEv)}
          onCancel={() => setConfirmCancel(selectedEv)}
          onBack={closeDetail}
        />
      ) : (
        <>
          <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-4 pb-3 relative">
            <div className="max-w-md mx-auto">
              <div className="mb-3">
                <h1 className="text-xl font-bold font-montserrat text-gray-900">Esperienze</h1>
                <p className="text-xs text-gray-400 mt-0.5">Impara. Cresci. Divertiti.</p>
              </div>
              <div className="relative mb-4">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-input text-sm" />
              </div>
            </div>
            {scrolled && (
              <div className="absolute left-0 right-0 bottom-0 translate-y-full h-6 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />
            )}
          </div>

          <div className="max-w-md mx-auto px-4 pb-4">
            <div ref={sentinelRef} className="h-px" />
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-3">
                {filtered.map(ev => (
                  <EventoCard
                    key={ev.id}
                    ev={ev}
                    iscrizione={iscrizioni.find(i => i.event_id === ev.id)}
                    onDetail={() => openDetail(ev)}
                    onEnroll={() => handleEnroll(ev)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <p className="font-bold text-gray-600 font-montserrat">
                  {eventi.length === 0 ? 'Nessun evento disponibile' : 'Nessun risultato'}
                </p>
                <p className="text-xs text-gray-400">
                  {eventi.length === 0 ? 'Gli eventi appariranno qui una volta pubblicati.' : 'Prova a modificare la ricerca'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {confirmCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-bold font-montserrat text-gray-900 pr-2">Cancella Partecipazione</h3>
              <button onClick={() => setConfirmCancel(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">Vuoi cancellare la tua iscrizione a "{confirmCancel.name}"?</p>
            <div className="flex gap-3">
              <button onClick={() => handleCancel(confirmCancel)} className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm">Conferma</button>
              <button onClick={() => setConfirmCancel(null)} className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-600">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
