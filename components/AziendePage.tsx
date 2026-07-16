import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Briefcase, ChevronLeft, ChevronRight, CheckCircle2, X, Star, SlidersHorizontal, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Company {
  id: string;
  name: string;
  settore: string | null;
  indirizzo: string | null;
  cap: string | null;
  provincia: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
}

// Colore deterministic basato sul nome
const LOGO_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-orange-500',
  'bg-violet-500', 'bg-pink-500', 'bg-teal-500', 'bg-red-500',
];
const GRADIENTS = [
  'from-blue-400 to-blue-600', 'from-green-400 to-emerald-600',
  'from-orange-400 to-red-500', 'from-violet-400 to-purple-600',
  'from-pink-400 to-rose-600', 'from-teal-400 to-cyan-600',
  'from-red-400 to-orange-500',
];

function colorIndex(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % LOGO_COLORS.length;
  return h;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function location(c: Company) {
  const parts = [c.indirizzo, c.cap, c.provincia].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Rimini, Emilia Romagna';
}


// ── Card lista colonna singola ─────────────────────────────────────────────────
const CompanyCard: React.FC<{ company: Company; onDetail: () => void }> = ({ company, onDetail }) => {
  const idx = colorIndex(company.name);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
      {/* Logo in riquadro */}
      <div className="shrink-0 w-20 h-20 rounded-xl border border-gray-100 flex items-center justify-center bg-white">
        {company.logo_url
          ? <img src={company.logo_url} alt={company.name} className="w-16 h-16 object-contain p-1" />
          : <div className={`w-12 h-12 ${LOGO_COLORS[idx]} rounded-xl flex items-center justify-center`}>
              <span className="text-white font-bold text-xl">{initials(company.name)}</span>
            </div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-base font-montserrat leading-snug mb-1.5 line-clamp-1">
          {company.name}
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(company.settore || 'Azienda').split(',').map(s => s.trim()).filter(Boolean).map(tag => (
            <span key={tag} className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-500 border border-orange-100">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <MapPin size={11} className="shrink-0" />
          <span className="truncate">{location(company)}</span>
        </div>
      </div>

      {/* Freccia */}
      <button onClick={onDetail} className="shrink-0 self-center text-gray-300 active:text-orange-500 transition-colors p-1">
        <ChevronRight size={26} strokeWidth={2} />
      </button>
    </div>
  );
};

// ── Vista dettaglio ───────────────────────────────────────────────────────────
const CompanyDetail: React.FC<{
  company: Company;
  isInterested: boolean;
  isSaved: boolean;
  onInterest: () => void;
  onSave: () => void;
  onBack: () => void;
}> = ({ company, isInterested, isSaved, onInterest, onSave, onBack }) => {
  const idx = colorIndex(company.name);

  return (
    <div className="max-w-md mx-auto flex flex-col min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-xs text-gray-400 font-medium">
        <button onClick={onBack} className="flex items-center gap-1 text-orange-500 font-bold">
          <ChevronLeft size={14} /> Aziende
        </button>
        <span>›</span>
        <span className="text-gray-500 truncate">{company.name}</span>
      </div>

      {/* Hero — solo se c'è la copertina */}
      <div className="relative mx-4">
        {company.cover_url && (
          <img src={company.cover_url} alt={company.name}
            className="w-full h-96 rounded-2xl object-cover mb-0" />
        )}

        {/* Info card */}
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm px-5 pt-4 pb-4 relative z-10 ${company.cover_url ? '-mt-6' : ''}`}>
          <div className="flex items-start justify-between gap-2 mb-3">
            <h2 className="font-bold font-montserrat text-gray-900 text-lg leading-snug flex-1">
              {company.name}
            </h2>
            {isInterested && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">
                Interesse
              </span>
            )}
          </div>
          <div className="space-y-1.5 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-1.5"><MapPin size={12} />{location(company)}</div>
            {company.website && (
              <div className="flex items-center gap-1.5">
                <Building2 size={12} />
                <a href={company.website} target="_blank" rel="noopener noreferrer"
                  className="text-orange-500 underline underline-offset-2">
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Briefcase size={12} />
              Posizioni aperte in arrivo
            </div>
          </div>
        </div>
      </div>

      {/* Contenuto */}
      <div className="flex-1 px-4 py-5 space-y-6">
        <div>
          <h3 className="font-bold font-montserrat text-gray-900 mb-2">Chi siamo</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {company.description || 'Descrizione aziendale in arrivo.'}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Briefcase size={24} className="text-gray-400" />
          </div>
          <p className="font-bold font-montserrat text-gray-700">Job Positions</p>
          <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
            Le posizioni aperte saranno disponibili a breve nella sezione Job Positions.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex items-center gap-3">
        <button
          onClick={onInterest}
          className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all ${
            isInterested ? 'bg-orange-100 text-orange-600 border-2 border-orange-200' : 'btn-primary-liquid'
          }`}
        >
          {isInterested ? '✓ Mi interessa' : 'Mi interessa'}
        </button>
        <button
          onClick={onSave}
          className={`px-5 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all flex items-center gap-2 ${
            isSaved ? 'border-orange-300 text-orange-500 bg-orange-50' : 'border-gray-200 text-gray-600'
          }`}
        >
          <Star size={16} className={isSaved ? 'fill-orange-500' : ''} />
          Salva
        </button>
      </div>
    </div>
  );
};

// ── Pagina principale ─────────────────────────────────────────────────────────
interface AziendePageProps {
  onDetailChange?: (isDetail: boolean) => void;
}

export const AziendePage: React.FC<AziendePageProps> = ({ onDetailChange }) => {
  const [companies, setCompanies]           = useState<Company[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [interestedIds, setInterestedIds]   = useState<string[]>([]);
  const [savedIds, setSavedIds]             = useState<string[]>([]);
  const [search, setSearch]                 = useState('');
  const [filterSector, setFilterSector]     = useState('Tutti');
  const [toast, setToast]                   = useState<string | null>(null);
  const [scrolled, setScrolled]             = useState(false);
  const sentinelRef                         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('aziende')
      .select('id, name, settore, indirizzo, cap, provincia, description, website, logo_url, cover_url')
      .eq('stato', 'attivo')
      .eq('mostra_partner', true)
      .order('name', { ascending: true })
      .then(({ data }) => { setCompanies((data ?? []) as Company[]); setLoading(false); });
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

  const openDetail  = (c: Company) => { setSelectedCompany(c); onDetailChange?.(true); };
  const closeDetail = ()            => { setSelectedCompany(null); onDetailChange?.(false); };
  const showToast   = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleInterest = (c: Company) => {
    const was = interestedIds.includes(c.id);
    setInterestedIds(prev => was ? prev.filter(id => id !== c.id) : [...prev, c.id]);
    showToast(was ? 'Interesse rimosso' : `Interesse registrato: ${c.name}`);
  };

  const handleSave = (c: Company) => {
    const was = savedIds.includes(c.id);
    setSavedIds(prev => was ? prev.filter(id => id !== c.id) : [...prev, c.id]);
    showToast(was ? 'Rimosso dai salvati' : `${c.name} salvata`);
  };

  const settori = ['Tutti', ...new Set(companies.map(c => c.settore).filter(Boolean))] as string[];

  const filtered = companies.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.settore ?? '').toLowerCase().includes(search.toLowerCase());
    const matchSector = filterSector === 'Tutti' || c.settore === filterSector;
    return matchSearch && matchSector;
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

      {selectedCompany ? (
        <CompanyDetail
          company={selectedCompany}
          isInterested={interestedIds.includes(selectedCompany.id)}
          isSaved={savedIds.includes(selectedCompany.id)}
          onInterest={() => handleInterest(selectedCompany)}
          onSave={() => handleSave(selectedCompany)}
          onBack={closeDetail}
        />
      ) : (
        <>
          {/* Header sticky */}
          <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-4 pb-3 relative">
            <div className="max-w-md mx-auto">
              <div className="mb-3">
                <h1 className="text-xl font-bold font-montserrat text-gray-900">Aziende</h1>
                <p className="text-xs text-gray-400 mt-0.5">Scopri le aziende partner del territorio</p>
              </div>
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text" placeholder="Cerca..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-input text-sm"
                />
              </div>
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <SlidersHorizontal size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select
                    value={filterSector} onChange={e => setFilterSector(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer"
                  >
                    {settori.map(o => <option key={o} value={o} className="bg-white">{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {scrolled && (
              <div className="absolute left-0 right-0 bottom-0 translate-y-full h-6 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />
            )}
          </div>

          {/* Griglia */}
          <div className="max-w-md mx-auto px-4 pb-4">
            <div ref={sentinelRef} className="h-px" />
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
              </div>
            ) : filtered.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filtered.map(c => (
                  <CompanyCard key={c.id} company={c} onDetail={() => openDetail(c)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <Building2 size={32} className="text-gray-300" />
                <p className="font-bold text-gray-600 font-montserrat">
                  {companies.length === 0 ? 'Nessuna azienda partner disponibile' : 'Nessun risultato'}
                </p>
                <p className="text-xs text-gray-400">
                  {companies.length === 0 ? 'Le aziende partner appariranno qui una volta aggiunte.' : 'Prova a modificare i filtri di ricerca'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
