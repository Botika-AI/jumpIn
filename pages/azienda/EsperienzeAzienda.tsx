import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, MapPin, Users, Search, SlidersHorizontal,
  CheckCircle2, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FilterDropdown } from './ProfileCard';

// ── Types ─────────────────────────────────────────────────────────────────

interface AziendaSession {
  id: string;
  name: string;
  email_account: string;
  logo_url: string | null;
  referente: string;
}

interface Esperienza {
  id: string;
  name: string;
  breve_descrizione: string | null;
  descrizione: string | null;
  event_date: string;
  event_end: string | null;
  location: string | null;
  logo_url: string | null;
  cover_url: string | null;
  modalita: string | null;
  tags: string[];
  max_partecipanti: number | null;
  cosa_impari: string[];
  requisiti: string | null;
  is_sponsor_requested: boolean;
}

const ALL_CATEGORIES = 'Tutte le categorie';
const ALL_MODES = 'Tutte le modalità';

const GRADIENTS = [
  'from-orange-400 to-orange-600', 'from-blue-500 to-blue-700',
  'from-violet-500 to-purple-600', 'from-teal-400 to-cyan-600',
  'from-pink-400 to-rose-500', 'from-emerald-500 to-green-600',
];

function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[h];
}

function fmtDateRange(start: string, end: string | null): string {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (!e || end === start) return s.toLocaleDateString('it-IT', { ...opts, year: 'numeric' });
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()}-${e.getDate()} ${e.toLocaleDateString('it-IT', { month: 'short' })} ${e.getFullYear()}`;
  return `${s.toLocaleDateString('it-IT', opts)} – ${e.toLocaleDateString('it-IT', { ...opts, year: 'numeric' })}`;
}

// ── Esperienza Card ───────────────────────────────────────────────────────

interface EsperienzaCardProps {
  esperienza: Esperienza;
  onDetail: () => void;
  onSponsor: () => void;
}

const EsperienzaCard: React.FC<EsperienzaCardProps> = ({ esperienza: ev, onDetail, onSponsor }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
    {/* Foto incorniciata */}
    <div className="p-3">
      <div className="rounded-xl overflow-hidden h-40">
        {ev.cover_url
          ? <img src={ev.cover_url} alt={ev.name} className="w-full h-full object-cover" />
          : <div className={`w-full h-full bg-gradient-to-br ${gradientFor(ev.id)}`} />}
      </div>
    </div>
    <div className="px-5 pb-5 flex flex-col gap-2 flex-1">
      <h3 className="font-bold text-gray-900 text-base font-montserrat leading-snug">{ev.name}</h3>
      {(ev.breve_descrizione || ev.descrizione) && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {ev.breve_descrizione || ev.descrizione}
        </p>
      )}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium flex-wrap">
        <span className="flex items-center gap-1 whitespace-nowrap"><CalendarDays size={12} />{fmtDateRange(ev.event_date, ev.event_end)}</span>
        {ev.location && (
          <>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1 whitespace-nowrap"><MapPin size={12} />{ev.location}</span>
          </>
        )}
        {ev.max_partecipanti != null && (
          <>
            <span className="text-gray-300">•</span>
            <span className="flex items-center gap-1 whitespace-nowrap"><Users size={12} />{ev.max_partecipanti} posti</span>
          </>
        )}
      </div>

      <div className="flex gap-2 mt-auto pt-2">
        {ev.is_sponsor_requested ? (
          <button
            disabled
            className="flex-1 py-2.5 rounded-xl bg-orange-300 text-white text-xs font-bold cursor-default flex items-center justify-center gap-1.5">
            <CheckCircle2 size={14} /> Richiesta inviata
          </button>
        ) : (
          <button
            onClick={onSponsor}
            className="flex-1 py-2.5 rounded-xl bg-[#F0813C] hover:bg-orange-500 text-white text-xs font-bold transition-colors">
            Diventa Partner
          </button>
        )}
        <button
          onClick={onDetail}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:border-orange-300 hover:text-orange-500 text-gray-700 text-xs font-semibold transition-colors">
          Dettagli
        </button>
      </div>
    </div>
  </div>
);

const EsperienzaCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse">
    <div className="p-3"><div className="h-40 bg-gray-100 rounded-xl" /></div>
    <div className="px-5 pb-5 space-y-3">
      <div className="h-4 bg-gray-100 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="flex gap-2 pt-2">
        <div className="flex-1 h-9 bg-gray-100 rounded-xl" />
        <div className="flex-1 h-9 bg-gray-100 rounded-xl" />
      </div>
    </div>
  </div>
);

// ── Sponsor Modal ─────────────────────────────────────────────────────────

interface SponsorModalProps {
  esperienza: Esperienza;
  session: AziendaSession;
  onClose: () => void;
  onSent: () => void;
}

const SponsorModal: React.FC<SponsorModalProps> = ({ esperienza, session, onClose, onSent }) => {
  const [referente, setReferente] = useState(session.referente || '');
  const [email, setEmail] = useState(session.email_account || '');
  const [messaggio, setMessaggio] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [gdpr, setGdpr] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = referente.trim().length > 0 && email.trim().length > 0 && privacy && gdpr && !sending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    const { error: rpcErr } = await supabase.rpc('request_event_sponsorship', {
      p_company_id: session.id,
      p_event_id:   esperienza.id,
      p_referente:  referente.trim(),
      p_email:      email.trim(),
      p_messaggio:  messaggio.trim() || null,
    });
    if (rpcErr) {
      console.error('request_event_sponsorship error:', rpcErr);
      setError(rpcErr.message);
      setSending(false);
      return;
    }
    onSent();
  };

  const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all';

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold font-montserrat text-gray-900 text-lg leading-tight">Diventa Partner</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-5">
            Come partner di <strong className="text-gray-500">{esperienza.name}</strong>, sponsorizzerai l'evento per avere visibilità extra su quell'evento specifico.
          </p>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-3">{error}</p>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nome Azienda</label>
              <input value={session.name} disabled className={`${inputClass} bg-gray-50 text-gray-400`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Referente</label>
              <input
                value={referente} onChange={e => setReferente(e.target.value)}
                placeholder="Nome Cognome" className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@azienda.com" className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Messaggio (opzionale)</label>
              <textarea
                value={messaggio} onChange={e => setMessaggio(e.target.value)} rows={3}
                placeholder="Raccontaci perché vuoi sponsorizzare questo evento..."
                className={`${inputClass} resize-none`}
              />
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-orange-500 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Accetto la{' '}
                <button type="button"
                  onClick={() => window.open('https://www.fattorcomune.com/privacy-policy/', '_blank')}
                  className="text-orange-500 font-semibold hover:underline underline-offset-2">
                  Privacy Policy
                </button>
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-orange-500 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Ho preso visione di{' '}
                <button type="button"
                  onClick={() => window.open('https://gdpr-info.eu/', '_blank')}
                  className="text-orange-500 font-semibold hover:underline underline-offset-2">
                  GDPR
                </button>
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 py-2.5 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-50">
                {sending ? 'Invio...' : 'Invia richiesta'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Annulla
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Detail View ───────────────────────────────────────────────────────────

interface DetailProps {
  esperienza: Esperienza;
  onBack: () => void;
  onSponsor: () => void;
}

const EsperienzaDetailModal: React.FC<DetailProps> = ({ esperienza: ev, onBack, onSponsor }) => (
  <>
    <div className="fixed inset-0 bg-black/30 z-50" onClick={onBack} />
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-start justify-center">
      <div className="w-full max-w-2xl my-8">
        <div className="flex justify-end mb-2">
          <button
            onClick={onBack}
            className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {/* Foto incorniciata */}
          <div className="p-3">
            <div className="rounded-xl overflow-hidden h-56">
              {ev.cover_url
                ? <img src={ev.cover_url} alt={ev.name} className="w-full h-full object-cover" />
                : <div className={`w-full h-full bg-gradient-to-br ${gradientFor(ev.id)}`} />}
            </div>
          </div>
          <div className="px-5 pb-5">
            <h1 className="text-xl font-bold font-montserrat text-gray-900 mb-2 leading-snug">{ev.name}</h1>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium flex-wrap">
              <span className="flex items-center gap-1 whitespace-nowrap"><CalendarDays size={12} />{fmtDateRange(ev.event_date, ev.event_end)}</span>
              {ev.location && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1 whitespace-nowrap"><MapPin size={12} />{ev.location}</span>
                </>
              )}
              {ev.max_partecipanti != null && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1 whitespace-nowrap"><Users size={12} />{ev.max_partecipanti} posti</span>
                </>
              )}
            </div>
          </div>

          <div className="px-6 pb-6 pt-5 border-t border-gray-100 space-y-5">
          {(ev.descrizione || ev.breve_descrizione) && (
            <div>
              <h2 className="font-bold font-montserrat text-gray-900 mb-2">Descrizione</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{ev.descrizione || ev.breve_descrizione}</p>
            </div>
          )}
          {ev.cosa_impari.length > 0 && (
            <div>
              <h2 className="font-bold font-montserrat text-gray-900 mb-2">Cosa porterai a casa</h2>
              <ul className="space-y-1.5">
                {ev.cosa_impari.map(c => (
                  <li key={c} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ev.requisiti && (
            <div>
              <h2 className="font-bold font-montserrat text-gray-900 mb-2">Requisiti</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{ev.requisiti}</p>
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-gray-100">
            {ev.is_sponsor_requested ? (
              <button
                disabled
                className="px-6 py-2.5 rounded-xl bg-orange-300 text-white text-sm font-bold cursor-default flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Richiesta inviata
              </button>
            ) : (
              <button
                onClick={onSponsor}
                className="px-6 py-2.5 rounded-xl bg-[#F0813C] hover:bg-orange-500 text-white text-sm font-bold transition-colors">
                Diventa Partner
              </button>
            )}
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Chiudi
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  </>
);

// ── Main ──────────────────────────────────────────────────────────────────

export const EsperienzeAzienda: React.FC<{ session: AziendaSession }> = ({ session }) => {
  const [esperienze, setEsperienze] = useState<Esperienza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState(ALL_CATEGORIES);
  const [filterModalita, setFilterModalita] = useState(ALL_MODES);
  const [sponsorTarget, setSponsorTarget] = useState<Esperienza | null>(null);
  const [detailTarget, setDetailTarget] = useState<Esperienza | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEsperienze = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('get_published_events_for_company', {
      p_company_id: session.id,
    });
    if (rpcErr) {
      console.error('get_published_events_for_company error:', rpcErr);
      setError(rpcErr.message);
    } else if (data) {
      setEsperienze(data as Esperienza[]);
    }
    setLoading(false);
  }, [session.id]);

  useEffect(() => {
    fetchEsperienze();
  }, [fetchEsperienze]);

  const tagOptions = [...new Set(esperienze.flatMap(e => e.tags || []))].sort();
  const modalitaOptions = [...new Set(esperienze.map(e => e.modalita).filter((m): m is string => !!m))].sort();

  const filtered = esperienze.filter(e => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || e.name.toLowerCase().includes(q)
      || (e.breve_descrizione ?? '').toLowerCase().includes(q)
      || (e.location ?? '').toLowerCase().includes(q);
    const matchTag = filterTag === ALL_CATEGORIES || (e.tags || []).includes(filterTag);
    const matchModalita = filterModalita === ALL_MODES || e.modalita === filterModalita;
    return matchSearch && matchTag && matchModalita;
  });

  const resetFilters = () => {
    setSearch('');
    setFilterTag(ALL_CATEGORIES);
    setFilterModalita(ALL_MODES);
  };

  const handleSponsorSent = () => {
    if (!sponsorTarget) return;
    const name = sponsorTarget.name;
    setEsperienze(prev => prev.map(e => e.id === sponsorTarget.id ? { ...e, is_sponsor_requested: true } : e));
    setDetailTarget(prev => prev && prev.id === sponsorTarget.id ? { ...prev, is_sponsor_requested: true } : prev);
    setSponsorTarget(null);
    showToast(`Richiesta di partnership inviata per ${name}`);
  };

  return (
    <div className="h-full flex flex-col">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold animate-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      {/* Header — fuori dall'area scrollabile */}
      <div className="shrink-0 pb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Esperienze</h1>
            <p className="text-sm text-gray-400 mt-0.5">Esplora eventi e opportunità di partnership</p>
          </div>
          <button
            onClick={() => showToast('Funzionalità in arrivo')}
            className="shrink-0 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-500 transition-colors bg-white">
            Proponi Esperienza
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text" placeholder="Cerca..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all bg-white"
            />
          </div>
          <FilterDropdown
            icon={<SlidersHorizontal size={12} />}
            value={filterTag}
            options={[ALL_CATEGORIES, ...tagOptions]}
            onChange={setFilterTag}
            widthClass="w-full md:w-52"
          />
          <FilterDropdown
            icon={<SlidersHorizontal size={12} />}
            value={filterModalita}
            options={[ALL_MODES, ...modalitaOptions]}
            onChange={setFilterModalita}
            widthClass="w-full md:w-52"
          />
        </div>
      </div>

      {/* Lista — scroll indipendente */}
      <div
        className="flex-1 min-h-0 overflow-y-auto relative"
        onScroll={e => setScrolled(e.currentTarget.scrollTop > 0)}
      >
        {scrolled && (
          <div className="sticky top-0 -mb-5 h-5 bg-gradient-to-b from-[#F5F6F8] to-transparent pointer-events-none z-10" />
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EsperienzaCardSkeleton />
            <EsperienzaCardSkeleton />
            <EsperienzaCardSkeleton />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
              <CalendarDays size={24} className="text-red-300" />
            </div>
            <p className="font-bold text-gray-700 text-sm mb-1">Errore nel caricamento delle esperienze</p>
            <p className="text-xs text-red-500 max-w-sm mx-auto leading-relaxed font-mono break-all">{error}</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mt-2">
              Assicurati di aver eseguito <strong>esperienze_azienda.sql</strong> nel SQL Editor di Supabase.
            </p>
          </div>
        ) : esperienze.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <CalendarDays size={24} className="text-gray-300" />
            </div>
            <p className="font-bold text-gray-700 text-sm mb-1">Nessuna esperienza pubblicata al momento</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              Le esperienze appariranno qui non appena verranno pubblicati nuovi eventi.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Search size={24} className="text-gray-300" />
            </div>
            <p className="font-bold text-gray-700 text-sm mb-1">Nessuna esperienza corrisponde ai filtri selezionati</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mb-4">
              Prova a modificare la ricerca o i filtri applicati.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors">
              Reimposta filtri
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(e => (
              <EsperienzaCard
                key={e.id}
                esperienza={e}
                onDetail={() => setDetailTarget(e)}
                onSponsor={() => setSponsorTarget(e)}
              />
            ))}
          </div>
        )}
      </div>

      {detailTarget && (
        <EsperienzaDetailModal
          esperienza={detailTarget}
          onBack={() => setDetailTarget(null)}
          onSponsor={() => setSponsorTarget(detailTarget)}
        />
      )}

      {sponsorTarget && (
        <SponsorModal
          esperienza={sponsorTarget} session={session}
          onClose={() => setSponsorTarget(null)}
          onSent={handleSponsorSent}
        />
      )}
    </div>
  );
};
