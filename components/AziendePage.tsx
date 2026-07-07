import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Briefcase, ChevronLeft, CheckCircle2, X, Star, UserCircle2, SlidersHorizontal, Code2, Palette, TrendingUp, Lightbulb, Rocket, Leaf } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  sector: string;
  location: string;
  fullDescription: string;
  LogoIcon: React.ElementType;
  logoColor: string;
  gradient: string;
  jobPositionsCount: number;
  benefits: string[];
  requirements: string;
  website?: string;
}

const COMPANIES: Company[] = [
  {
    id: 'techhub_rimini',
    name: 'TechHub Rimini',
    sector: 'Tecnologia',
    location: 'Rimini, Emilia Romagna',
    fullDescription: 'TechHub Rimini è una startup tecnologica fondata nel 2018, specializzata nello sviluppo di piattaforme digitali per il settore turistico e dell\'hospitality. Con un team giovane e dinamico, offriamo un ambiente stimolante dove crescere come sviluppatore, designer o marketer.',
    LogoIcon: Code2,
    logoColor: 'bg-blue-500',
    gradient: 'from-blue-400 to-blue-600',
    jobPositionsCount: 5,
    benefits: ['Stage retribuito', 'Mentorship da professionisti senior', 'Flessibilità oraria', 'Accesso a corsi di formazione'],
    requirements: 'Conoscenza base di JavaScript o Python. Passione per l\'innovazione digitale.',
    website: 'https://techhub.rimini.it',
  },
  {
    id: 'designstudio_rn',
    name: 'DesignStudio RN',
    sector: 'Design',
    location: 'Rimini, Emilia Romagna',
    fullDescription: 'DesignStudio RN è un\'agenzia di design con sede a Rimini, specializzata in brand identity, UX/UI design e comunicazione visiva per brand locali e internazionali. Lavoriamo con clienti nei settori moda, food e turismo.',
    LogoIcon: Palette,
    logoColor: 'bg-green-500',
    gradient: 'from-green-400 to-emerald-600',
    jobPositionsCount: 5,
    benefits: ['Portfolio professionale garantito', 'Formazione su tool Figma e Adobe', 'Team giovane e creativo', 'Feedback continuo e crescita rapida'],
    requirements: 'Conoscenza base di Figma o Adobe Suite. Portfolio di lavori personali (anche scolastici).',
    website: 'https://designstudio.rn.it',
  },
  {
    id: 'marketingplus_srl',
    name: 'MarketingPlus SRL',
    sector: 'Marketing',
    location: 'Rimini, Emilia Romagna',
    fullDescription: 'MarketingPlus SRL è un\'agenzia di marketing digitale con oltre 10 anni di esperienza. Gestiamo campagne social, SEO e ADV per PMI e grandi brand. Offriamo stage formativi con affiancamento diretto ai team di specialisti.',
    LogoIcon: TrendingUp,
    logoColor: 'bg-orange-500',
    gradient: 'from-orange-400 to-red-500',
    jobPositionsCount: 5,
    benefits: ['Gestione diretta di campagne reali', 'Accesso a tool premium (HubSpot, SEMrush)', 'Attestato di competenza', 'Possibilità di assunzione'],
    requirements: 'Buona conoscenza dei principali social media. Creatività e senso analitico.',
    website: 'https://marketingplus.it',
  },
  {
    id: 'innovate_srl',
    name: 'Innovate SRL',
    sector: 'Innovazione',
    location: 'Rimini, Emilia Romagna',
    fullDescription: 'Innovate SRL è un incubatore di startup con sede a Rimini. Supportiamo giovani imprenditori nello sviluppo di idee innovative, offrendo spazi di coworking, mentorship e accesso a investitori.',
    LogoIcon: Lightbulb,
    logoColor: 'bg-violet-500',
    gradient: 'from-violet-400 to-purple-600',
    jobPositionsCount: 0,
    benefits: ['Accesso allo spazio coworking', 'Network con imprenditori', 'Workshop mensili gratuiti'],
    requirements: 'Nessun requisito specifico. Spirito imprenditoriale e voglia di fare.',
  },
  {
    id: 'startup_factory',
    name: 'Startup Factory',
    sector: 'Startup',
    location: 'Rimini, Emilia Romagna',
    fullDescription: 'Startup Factory è un acceleratore di startup con focus su progetti tech e sostenibili. Selezioniamo ogni anno i progetti più promettenti del territorio e li supportiamo con mentorship, funding e connessioni con il mercato.',
    LogoIcon: Rocket,
    logoColor: 'bg-pink-500',
    gradient: 'from-pink-400 to-rose-600',
    jobPositionsCount: 0,
    benefits: ['Mentorship personalizzata', 'Accesso a investor network', 'Demo Day annuale'],
    requirements: 'Avere un\'idea di business. Disponibilità per il programma di accelerazione.',
  },
  {
    id: 'greenfuture_rn',
    name: 'GreenFuture RN',
    sector: 'Sostenibilità',
    location: 'Rimini, Emilia Romagna',
    fullDescription: 'GreenFuture RN è una società di consulenza specializzata in sostenibilità ambientale e transizione ecologica per imprese e PA. Operiamo su progetti di efficienza energetica, economia circolare e rendicontazione ESG.',
    LogoIcon: Leaf,
    logoColor: 'bg-teal-500',
    gradient: 'from-teal-400 to-cyan-600',
    jobPositionsCount: 0,
    benefits: ['Impatto ambientale reale', 'Formazione su normativa ESG', 'Network con esperti di sostenibilità'],
    requirements: 'Interesse per le tematiche ambientali. Conoscenza base di Excel.',
  },
];

const SECTOR_OPTIONS = ['Tutti i settori', 'Tecnologia', 'Design', 'Marketing', 'Innovazione', 'Startup', 'Sostenibilità'];
const POSITION_OPTIONS = ['Tutte', 'Con posizioni aperte', 'Senza posizioni'];

type DetailTab = 'dettagli' | 'posizioni' | 'team';

// ── Card griglia 2 colonne ─────────────────────────────────────────────────────
const CompanyCard: React.FC<{
  company: Company;
  onDetail: () => void;
}> = ({ company, onDetail }) => {
  const { LogoIcon } = company;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex flex-col">
      {/* Logo centrato */}
      <div className="flex justify-center mb-3">
        <div className={`w-14 h-14 ${company.logoColor} rounded-2xl flex items-center justify-center shadow-sm`}>
          <LogoIcon size={26} strokeWidth={1.75} color="white" />
        </div>
      </div>

      {/* Nome */}
      <h3 className="font-bold text-gray-900 text-xs font-montserrat text-center leading-snug line-clamp-2 mb-1.5">
        {company.name}
      </h3>

      {/* Tag settore */}
      <div className="flex justify-center mb-3">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-500">
          {company.sector}
        </span>
      </div>

      {/* Location — riga propria */}
      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1">
        <MapPin size={9} className="shrink-0" />
        <span className="truncate">{company.location}</span>
      </div>

      {/* Job positions — riga propria */}
      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-3">
        <Briefcase size={9} className="shrink-0" />
        <span>
          {company.jobPositionsCount > 0
            ? `${company.jobPositionsCount} Job Positions`
            : 'Nessuna Job Position'}
        </span>
      </div>

      {/* Bottone Dettagli sempre visibile */}
      <div className="mt-auto">
        <button
          onClick={onDetail}
          className="w-full py-2 rounded-xl btn-primary-liquid text-[10px] font-bold"
        >
          Dettagli
        </button>
      </div>
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
  const [tab, setTab] = useState<DetailTab>('dettagli');
  const { LogoIcon } = company;

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

      {/* Hero gradiente con icona */}
      <div className="relative mx-4">
        <div className={`rounded-2xl bg-gradient-to-br ${company.gradient} h-40 flex items-end p-5`}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow">
              <LogoIcon size={28} strokeWidth={1.75} color="white" />
            </div>
            <div className="text-white drop-shadow">
              <p className="font-bold text-base leading-tight">{company.name}</p>
              <p className="text-xs opacity-85">{company.sector}</p>
            </div>
          </div>
        </div>

        {/* Peek card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 pt-4 pb-4 -mt-5 relative z-10">
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
            <div className="flex items-center gap-1.5"><MapPin size={12} />{company.location}</div>
            <div className="flex items-center gap-1.5">
              <Briefcase size={12} />
              {company.jobPositionsCount > 0 ? `${company.jobPositionsCount} Job Positions` : 'Nessuna Job Position'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mx-4 mt-4">
        {(['dettagli', 'posizioni', 'team'] as DetailTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-bold capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Contenuto tab */}
      <div className="flex-1 px-4 py-5 space-y-6">
        {tab === 'dettagli' && (
          <>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-2">Descrizione</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{company.fullDescription}</p>
            </div>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-3">Cosa porterai a casa</h3>
              <ul className="space-y-2.5">
                {company.benefits.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />{item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-2">Requisiti</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{company.requirements}</p>
            </div>
          </>
        )}
        {tab === 'posizioni' && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Briefcase size={24} className="text-gray-400" />
            </div>
            <p className="font-bold font-montserrat text-gray-700">
              {company.jobPositionsCount > 0
                ? `${company.jobPositionsCount} posizioni aperte`
                : 'Nessuna posizione aperta'}
            </p>
            <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
              Le posizioni dettagliate saranno disponibili nella sezione Job Positions.
            </p>
          </div>
        )}
        {tab === 'team' && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <UserCircle2 size={24} className="text-gray-400" />
            </div>
            <p className="font-bold font-montserrat text-gray-700">Team aziendale</p>
            <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
              Le informazioni sul team aziendale saranno disponibili a breve.
            </p>
          </div>
        )}
      </div>

      {/* Footer azioni */}
      <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex items-center gap-3">
        <button
          onClick={onInterest}
          className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all ${
            isInterested
              ? 'bg-orange-100 text-orange-600 border-2 border-orange-200'
              : 'btn-primary-liquid'
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
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('Tutti i settori');
  const [filterPositions, setFilterPositions] = useState('Tutte');
  const [toast, setToast] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const openDetail = (company: Company) => { setSelectedCompany(company); onDetailChange?.(true); };
  const closeDetail = () => { setSelectedCompany(null); onDetailChange?.(false); };

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

  const handleInterest = (company: Company) => {
    const wasInterested = interestedIds.includes(company.id);
    setInterestedIds((prev: string[]) => wasInterested ? prev.filter((id: string) => id !== company.id) : [...prev, company.id]);
    showToast(wasInterested ? 'Interesse rimosso' : `Interesse registrato: ${company.name}`);
  };

  const handleSave = (company: Company) => {
    const wasSaved = savedIds.includes(company.id);
    setSavedIds((prev: string[]) => wasSaved ? prev.filter((id: string) => id !== company.id) : [...prev, company.id]);
    showToast(wasSaved ? 'Rimosso dai salvati' : `${company.name} salvata`);
  };

  const filtered = COMPANIES.filter(c => {
    const matchSearch = search === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.sector.toLowerCase().includes(search.toLowerCase());
    const matchSector = filterSector === 'Tutti i settori' || c.sector === filterSector;
    const matchPositions = filterPositions === 'Tutte' ||
      (filterPositions === 'Con posizioni aperte' && c.jobPositionsCount > 0) ||
      (filterPositions === 'Senza posizioni' && c.jobPositionsCount === 0);
    return matchSearch && matchSector && matchPositions;
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
          {/* Header sticky — titolo a sx, icone nav a dx (gestite da AppShell) */}
          <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-11 pb-3 relative">
            <div className="max-w-md mx-auto">
              <h1 className="text-xl font-bold font-montserrat text-gray-900 mb-3">Aziende</h1>

              {/* Ricerca */}
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cerca..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-2xl glass-input text-sm"
                />
              </div>

              {/* Filtri */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <SlidersHorizontal size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select
                    value={filterSector}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterSector(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer"
                  >
                    {SECTOR_OPTIONS.map(o => <option key={o} value={o} className="bg-white">{o}</option>)}
                  </select>
                </div>
                <select
                  value={filterPositions}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterPositions(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer"
                >
                  {POSITION_OPTIONS.map(o => <option key={o} value={o} className="bg-white">{o}</option>)}
                </select>
              </div>
            </div>
            {scrolled && (
              <div className="absolute left-0 right-0 bottom-0 translate-y-full h-6 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />
            )}
          </div>

          {/* Griglia */}
          <div className="max-w-md mx-auto px-4 pb-4">
            <div ref={sentinelRef} className="h-px" />
            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map(company => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onDetail={() => openDetail(company)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <p className="font-bold text-gray-600 font-montserrat">Nessun risultato</p>
                <p className="text-xs text-gray-400">Prova a modificare i filtri di ricerca</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
