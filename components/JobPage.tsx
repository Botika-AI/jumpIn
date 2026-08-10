import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, MapPin, Clock, ChevronLeft, ChevronRight, CheckCircle2, X, Star,
  SlidersHorizontal, Briefcase, Heart, Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Azienda {
  name: string;
  settore: string | null;
  logo_url: string | null;
  description: string | null;
}

interface JobPost {
  id: string;
  azienda_id: string | null;
  titolo: string;
  modalita: string | null;
  sede: string | null;
  descrizione: string | null;
  responsabilita: string | null;
  requisiti: string | null;
  deadline_candidature: string | null;
  form_esterno: string | null;
  created_at: string;
  aziende: Azienda | null;
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function extractCity(sede: string | null): string | null {
  if (!sede) return null;
  return sede.split(',')[0].trim();
}

function fmtDaysAgo(dateStr: string): string {
  const d = daysAgo(dateStr);
  if (d === 0) return 'Oggi';
  if (d === 1) return '1 giorno fa';
  return `${d} giorni fa`;
}

// Stessi colori di AziendePage per fallback logo
const LOGO_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-orange-500',
  'bg-violet-500', 'bg-pink-500', 'bg-teal-500', 'bg-red-500',
];
function colorIndex(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % LOGO_COLORS.length;
  return h;
}

// ── Logo aziendale — stesso box di AziendePage ────────────────────────────────
const CompanyLogo: React.FC<{ azienda: Azienda | null }> = ({ azienda }) => {
  const inits = azienda?.name
    ? azienda.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'JP';
  const idx = colorIndex(azienda?.name ?? '');
  return (
    <div className="shrink-0 w-20 h-20 rounded-xl border border-gray-100 flex items-center justify-center bg-white overflow-hidden">
      {azienda?.logo_url
        ? <img src={azienda.logo_url} alt={azienda.name} className="w-16 h-16 object-contain p-1" />
        : <div className={`w-12 h-12 ${LOGO_COLORS[idx]} rounded-xl flex items-center justify-center`}>
            <span className="text-white font-bold text-xl">{inits}</span>
          </div>
      }
    </div>
  );
};

// ── Job Card — stile LinkedIn + logo Aziende ─────────────────────────────────
const JobCard: React.FC<{
  job: JobPost;
  isInterested: boolean;
  onDetail: () => void;
  onInterest: () => void;
}> = ({ job, onDetail }) => {
  const city = extractCity(job.sede);
  const locationLine = [city, job.modalita].filter(Boolean).join(' · ');

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 active:bg-gray-50 transition-colors cursor-pointer"
      onClick={onDetail}
    >
      {/* Logo — identico ad AziendePage */}
      <CompanyLogo azienda={job.aziende} />

      {/* Info stack */}
      <div className="flex-1 min-w-0">
        <h3 className="font-extrabold text-[16px] text-gray-950 font-montserrat leading-snug line-clamp-2 tracking-tight">
          {job.titolo}
        </h3>
        <div className="flex flex-col gap-1 mt-1.5">
          {job.aziende?.name && (
            <span className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
              <Building2 size={11} className="shrink-0 text-gray-400" />
              <span className="truncate">{job.aziende.name}</span>
            </span>
          )}
          {locationLine && (
            <span className="flex items-center gap-1 text-xs text-gray-400 min-w-0">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{locationLine}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
            <Clock size={11} className="shrink-0" />
            <span>{fmtDaysAgo(job.created_at)}</span>
          </span>
        </div>
      </div>

      {/* Freccia */}
      <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-gray-300" />
    </div>
  );
};

// ── Blocco accordion espandibile ─────────────────────────────────────────────
const AccordionBlock: React.FC<{ title: string; text: string }> = ({ title, text }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <h3 className="font-bold font-montserrat text-gray-900 text-[15px] mb-1.5">{title}</h3>
      <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${open ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      <button onClick={() => setOpen(o => !o)} className="mt-1 text-xs font-semibold text-orange-500">
        {open ? 'Leggi meno ↑' : 'Leggi tutto ↓'}
      </button>
    </div>
  );
};

// ── Vista dettaglio ───────────────────────────────────────────────────────────
type DetailTab = 'dettagli' | 'contatti';

const JobDetail: React.FC<{
  job: JobPost;
  isInterested: boolean;
  isSaved: boolean;
  onInterest: () => void;
  onSave: () => void;
  onBack: () => void;
  onOpenCompany?: (companyId: string) => void;
}> = ({ job, isInterested, isSaved, onInterest, onSave, onBack, onOpenCompany }) => {
  const [tab, setTab]             = useState<DetailTab>('dettagli');
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const handleInterestClick = () => {
    if (isInterested) { onInterest(); return; }
    setShowModal(true);
  };
  const handleConfirm = () => {
    onInterest();
    setShowModal(false);
    setShowBanner(true);
  };

  const city = extractCity(job.sede);
  const metaParts = [
    city,
    job.modalita,
    fmtDaysAgo(job.created_at),
    job.deadline_candidature
      ? `Scade il ${new Date(job.deadline_candidature).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}`
      : null,
  ].filter(Boolean);

  const logoInits = job.aziende?.name
    ? job.aziende.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'JP';
  const logoIdx = colorIndex(job.aziende?.name ?? '');

  const TAB_LABELS: Record<DetailTab, string> = {
    dettagli: 'Dettagli',
    contatti: 'Contatti',
  };

  return (
    <div className="max-w-md mx-auto flex flex-col min-h-full">

      {/* Back */}
      <div className="flex items-center px-4 pt-3 pb-2">
        <button onClick={onBack} className="flex items-center gap-1 text-orange-500 font-bold text-xs">
          <ChevronLeft size={14} /> Job Positions
        </button>
      </div>

      {/* ── Header fisso ── */}
      <div className="px-4 pb-4 border-b border-gray-100">

        {/* Logo + nome azienda — cliccabile */}
        <button
          onClick={() => job.azienda_id && onOpenCompany?.(job.azienda_id)}
          className="flex items-center gap-2.5 mb-2 active:opacity-70 transition-opacity"
        >
          {job.aziende?.logo_url
            ? <img src={job.aziende.logo_url} alt={job.aziende?.name} className="w-10 h-10 object-contain shrink-0" />
            : <div className={`w-10 h-10 rounded-xl ${LOGO_COLORS[logoIdx]} flex items-center justify-center shrink-0`}>
                <span className="text-white text-xs font-bold">{logoInits}</span>
              </div>
          }
          <span className="text-base font-bold text-gray-800 truncate">{job.aziende?.name}</span>
        </button>

        {/* Titolo grande */}
        <h2 className="font-extrabold font-montserrat text-gray-950 text-xl leading-tight mb-1.5">
          {job.titolo}
        </h2>

        {/* Metadati grigi */}
        <p className="text-xs text-gray-400 leading-relaxed mb-3">
          {[city, job.modalita].filter(Boolean).join(' - ')}
          {(city || job.modalita) && ' · '}
          {fmtDaysAgo(job.created_at)}
        </p>

      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-100 px-4">
        {(['dettagli', 'contatti'] as DetailTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-[11px] font-bold transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── Contenuto scrollabile ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {tab === 'dettagli' && (
          <>
            {job.descrizione    && <AccordionBlock title="Descrizione"             text={job.descrizione} />}
            {job.responsabilita && <AccordionBlock title="Responsabilità principali" text={job.responsabilita} />}
            {job.requisiti      && <AccordionBlock title="Requisiti"               text={job.requisiti} />}
            {job.deadline_candidature && (
              <div className="bg-orange-50 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Clock size={15} className="text-orange-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Scadenza candidature</p>
                  <p className="text-sm font-semibold text-orange-700">
                    {new Date(job.deadline_candidature).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'contatti' && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Building2 size={24} className="text-gray-300" />
            </div>
            <p className="font-bold font-montserrat text-gray-700">Contatti non disponibili</p>
            <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
              Le informazioni di contatto per questa offerta non sono ancora disponibili.
            </p>
          </div>
        )}
      </div>

      {/* ── Footer bottoni ── */}
      <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex items-center gap-3">
        {showBanner && (
          <div className="absolute bottom-20 left-4 right-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <CheckCircle2 size={13} className="text-green-500 shrink-0" />
            <p className="text-xs font-semibold text-green-700 flex-1">Candidatura inviata con successo!</p>
            <button onClick={() => setShowBanner(false)} className="text-green-400 shrink-0"><X size={13} /></button>
          </div>
        )}
        <button
          onClick={handleInterestClick}
          className={`flex-1 py-3.5 rounded-2xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            isInterested ? 'bg-orange-100 text-orange-600 border-2 border-orange-200' : 'btn-primary-liquid'
          }`}
        >
          {isInterested && <Heart size={15} className="fill-orange-500" />}
          {isInterested ? 'Candidato' : 'Mi interessa'}
        </button>
        <button
          onClick={onSave}
          className={`px-5 py-3.5 rounded-2xl border-2 font-medium text-sm transition-all flex items-center gap-2 ${
            isSaved ? 'border-orange-300 text-orange-500 bg-orange-50' : 'border-gray-200 text-gray-600'
          }`}
        >
          <Star size={16} className={isSaved ? 'fill-orange-500' : ''} />
          Salva
        </button>
      </div>

      {/* ── Bottom Sheet — Conferma Candidatura ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div
            className="relative bg-white rounded-t-3xl px-6 pt-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <h3 className="font-bold font-montserrat text-gray-900 text-lg mb-1.5">Conferma Candidatura</h3>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">Vuoi candidarti per questa offerta di lavoro?</p>
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Ruolo</p>
                <p className="text-sm font-semibold text-gray-900">{job.titolo}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Azienda</p>
                <p className="text-sm font-semibold text-gray-900">{job.aziende?.name ?? '—'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm">
                Annulla
              </button>
              <button onClick={handleConfirm}
                className="flex-1 py-3.5 rounded-2xl btn-primary-liquid text-sm font-bold">
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Pagina principale ─────────────────────────────────────────────────────────
interface JobPageProps {
  onDetailChange?: (isDetail: boolean) => void;
  initialCompanyFilter?: { id: string; name: string };
  onOpenCompany?: (companyId: string) => void;
}

export const JobPage: React.FC<JobPageProps> = ({ onDetailChange, initialCompanyFilter, onOpenCompany }) => {
  const [jobs, setJobs]           = useState<JobPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [appliedIds, setAppliedIds]   = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set());
  const [search, setSearch]           = useState('');
  const [filterSector, setFilterSector]     = useState('');
  const [filterWorkMode, setFilterWorkMode] = useState('');
  const [filterCompany, setFilterCompany]   = useState<{ id: string; name: string } | null>(initialCompanyFilter ?? null);
  const [toast, setToast]           = useState<string | null>(null);
  const [userId, setUserId]         = useState<string | null>(null);
  const scrolled = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const openDetail  = (job: JobPost) => { setSelectedJob(job); onDetailChange?.(true); };
  const closeDetail = () => { setSelectedJob(null); onDetailChange?.(false); };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // Fetch user + jobs + existing applications
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data, error } = await supabase
      .from('job_positions')
      .select('id, azienda_id, titolo, modalita, sede, descrizione, responsabilita, requisiti, deadline_candidature, form_esterno, created_at, aziende(name, settore, logo_url, description)')
      .neq('stato', 'chiuso')
      .order('created_at', { ascending: false });

    if (error) console.error('JobPage fetch error:', error);

    setJobs((data ?? []) as unknown as JobPost[]);

    if (user?.id) {
      const { data: apps } = await supabase
        .from('job_applications')
        .select('job_position_id')
        .eq('user_id', user.id);
      setAppliedIds(new Set((apps ?? []).map(a => a.job_position_id)));
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (initialCompanyFilter) setFilterCompany(initialCompanyFilter);
  }, [initialCompanyFilter?.id]);

  // Candidatura
  const handleInterest = async (job: JobPost) => {
    if (!userId) return;
    const wasApplied = appliedIds.has(job.id);
    if (wasApplied) {
      await supabase.from('job_applications').delete()
        .eq('job_position_id', job.id).eq('user_id', userId);
      setAppliedIds(prev => { const s = new Set(prev); s.delete(job.id); return s; });
      showToast('Candidatura ritirata');
    } else {
      await supabase.from('job_applications').insert({ job_position_id: job.id, user_id: userId });
      setAppliedIds(prev => new Set([...prev, job.id]));
    }
  };

  const handleSave = (job: JobPost) => {
    const wasSaved = savedIds.has(job.id);
    setSavedIds(prev => { const s = new Set(prev); wasSaved ? s.delete(job.id) : s.add(job.id); return s; });
    showToast(wasSaved ? 'Rimosso dai salvati' : `${job.titolo} salvata`);
  };

  // Settori unici dai dati reali
  const sectors = [...new Set(jobs.map(j => j.aziende?.settore).filter(Boolean))] as string[];
  const workModes = [...new Set(jobs.map(j => j.modalita).filter(Boolean))] as string[];

  const filtered = jobs.filter(j => {
    if (search && !j.titolo.toLowerCase().includes(search.toLowerCase()) &&
        !j.aziende?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSector && j.aziende?.settore !== filterSector) return false;
    if (filterWorkMode && j.modalita !== filterWorkMode) return false;
    if (filterCompany && j.azienda_id !== filterCompany.id) return false;
    return true;
  });

  return (
    <div className="min-h-full">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 size={16} className="text-green-500 shrink-0" />
          <p className="text-xs font-semibold text-gray-700 flex-1 leading-relaxed">{toast}</p>
          <button onClick={() => setToast(null)} className="text-gray-300 hover:text-gray-500 shrink-0"><X size={14} /></button>
        </div>
      )}

      {selectedJob ? (
        <JobDetail
          job={selectedJob}
          isInterested={appliedIds.has(selectedJob.id)}
          isSaved={savedIds.has(selectedJob.id)}
          onInterest={() => handleInterest(selectedJob)}
          onSave={() => handleSave(selectedJob)}
          onBack={closeDetail}
          onOpenCompany={onOpenCompany}
        />
      ) : (
        <>
          {/* Header sticky */}
          <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-4 pb-3">
            <div className="max-w-md mx-auto">
              <div className="mb-3">
                <h1 className="text-xl font-bold font-montserrat text-gray-900">Job Positions</h1>
                <p className="text-xs text-gray-400 mt-0.5">Trova l'opportunità giusta per te</p>
              </div>
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Cerca..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-input text-sm" />
              </div>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <SlidersHorizontal size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer">
                    <option value="">Tutti i settori</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <select value={filterWorkMode} onChange={e => setFilterWorkMode(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer">
                  <option value="">Tutte le modalità</option>
                  {workModes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Griglia */}
          <div className="max-w-md mx-auto px-4 pb-4">
            <div ref={sentinelRef} className="h-px" />
            {filterCompany && (
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {filterCompany.name}
                  <button onClick={() => setFilterCompany(null)} className="text-orange-400 hover:text-orange-600 ml-0.5">
                    <X size={12} />
                  </button>
                </span>
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <p className="text-xs font-semibold text-gray-500 mb-3">
                {filtered.length} offert{filtered.length === 1 ? 'a' : 'e'} disponibil{filtered.length === 1 ? 'e' : 'i'}
              </p>
            )}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
              </div>
            ) : filtered.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filtered.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isInterested={appliedIds.has(job.id)}
                    onDetail={() => openDetail(job)}
                    onInterest={() => handleInterest(job)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Briefcase size={24} className="text-gray-300" />
                </div>
                <p className="font-bold text-gray-600 font-montserrat">
                  {jobs.length === 0 ? 'Nessuna offerta disponibile' : 'Nessun risultato'}
                </p>
                <p className="text-xs text-gray-400">
                  {jobs.length === 0 ? 'Le offerte di lavoro appariranno qui' : 'Prova a modificare i filtri'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
