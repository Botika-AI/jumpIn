import React, { useState, useEffect, useRef } from 'react';
import {
  Search, MapPin, Clock, ChevronLeft, CheckCircle2, X, Star,
  SlidersHorizontal, Code2, Palette, TrendingUp, Lightbulb, Rocket, Leaf, Heart,
} from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
  email: string;
}

interface JobPosition {
  id: string;
  title: string;
  companyName: string;
  sector: string;
  location: string;
  workMode: string;
  description: string;
  benefits: string[];
  requirements: string;
  companyDescription: string;
  team: TeamMember[];
  daysAgo: number;
  LogoIcon: React.ElementType;
  logoColor: string;
}

const JOB_POSITIONS: JobPosition[] = [
  {
    id: 'job_techhub_fullstack',
    title: 'Full Stack Developer',
    companyName: 'TechHub Rimini',
    sector: 'Tecnologia',
    location: 'Rimini, Emilia Romagna',
    workMode: 'In Sede',
    description: 'Unisciti a noi per 48 ore di coding intensivo! Crea soluzioni AI innovative insieme ad altri appassionati di tecnologia. Il team vincitore riceverà un premio di €6.000 e la possibilità di presentare il progetto a importanti aziende del settore tech.',
    benefits: ['Badge "AI Innovator"', 'Attestato di partecipazione', 'Network con professionisti del settore', 'Accesso esclusivo a risorse e tool AI'],
    requirements: 'Conoscenza base di Python, passione per l\'AI e tanta voglia di imparare! Il laptop è necessario.',
    companyDescription: 'TechHub Rimini è una startup tecnologica fondata nel 2018, specializzata nello sviluppo di piattaforme digitali per il settore turistico e dell\'hospitality.',
    team: [
      { name: 'Marco Bianchi', role: 'CTO', email: 'marco.bianchi@techhub.it' },
      { name: 'Laura Verdi', role: 'HR Manager', email: 'laura.verdi@techhub.it' },
      { name: 'Paolo Rossi', role: 'Tech Lead', email: 'paolo.rossi@techhub.it' },
    ],
    daysAgo: 3,
    LogoIcon: Code2,
    logoColor: 'bg-blue-500',
  },
  {
    id: 'job_design_uxui',
    title: 'UX/UI Designer',
    companyName: 'DesignStudio RN',
    sector: 'Design',
    location: 'Rimini, Emilia Romagna',
    workMode: 'Ibrido',
    description: 'Cerchiamo un UX/UI Designer appassionato di human-centered design. Lavorerai su progetti reali per brand del territorio, creando interfacce intuitive e visivamente accattivanti con Figma e Adobe Creative Suite.',
    benefits: ['Portfolio professionale garantito', 'Formazione avanzata su Figma', 'Accesso ai tool Adobe CC', 'Mentorship da senior designer'],
    requirements: 'Conoscenza base di Figma o Adobe XD. Portfolio di lavori personali (anche scolastici). Creatività e occhio per i dettagli.',
    companyDescription: 'DesignStudio RN è un\'agenzia di design specializzata in brand identity, UX/UI e comunicazione visiva per brand locali e internazionali.',
    team: [
      { name: 'Sara Colombo', role: 'Creative Director', email: 'sara.colombo@designstudio.it' },
      { name: 'Luca Ferrari', role: 'Senior Designer', email: 'luca.ferrari@designstudio.it' },
    ],
    daysAgo: 5,
    LogoIcon: Palette,
    logoColor: 'bg-green-500',
  },
  {
    id: 'job_marketing_social',
    title: 'Social Media Manager',
    companyName: 'MarketingPlus SRL',
    sector: 'Marketing',
    location: 'Rimini, Emilia Romagna',
    workMode: 'In Sede',
    description: 'Gestisci i social media di brand locali e nazionali. Creerai contenuti, pianificherai campagne e analizzerai le performance su Instagram, TikTok e LinkedIn, affiancato da un team di esperti digital marketer.',
    benefits: ['Gestione diretta di profili reali', 'Accesso a tool premium (HubSpot, SEMrush)', 'Attestato di competenza digitale', 'Possibilità di assunzione'],
    requirements: 'Buona conoscenza dei principali social media. Creatività e senso estetico. Capacità di copywriting di base.',
    companyDescription: 'MarketingPlus SRL è un\'agenzia di marketing digitale con oltre 10 anni di esperienza. Gestiamo campagne social, SEO e ADV per PMI e grandi brand.',
    team: [
      { name: 'Giulia Mancini', role: 'Social Media Lead', email: 'giulia.mancini@marketingplus.it' },
      { name: 'Roberto Esposito', role: 'Account Manager', email: 'roberto.esposito@marketingplus.it' },
      { name: 'Chiara Neri', role: 'Content Creator', email: 'chiara.neri@marketingplus.it' },
    ],
    daysAgo: 1,
    LogoIcon: TrendingUp,
    logoColor: 'bg-orange-500',
  },
  {
    id: 'job_innovate_data',
    title: 'AI & Data Analyst',
    companyName: 'Innovate SRL',
    sector: 'Innovazione',
    location: 'Rimini, Emilia Romagna',
    workMode: 'Remoto',
    description: 'Analizza dati e costruisci modelli AI per startup del territorio. Lavorerai con Python, Pandas e strumenti di machine learning su progetti reali, supportato da mentor esperti del settore.',
    benefits: ['Accesso allo spazio coworking', 'Network con startup del territorio', 'Certificazione in Data Science', 'Toolkit AI professionale'],
    requirements: 'Conoscenza di Python e concetti base di statistica. Curiosità per l\'intelligenza artificiale. Laptop personale.',
    companyDescription: 'Innovate SRL è un incubatore di startup con sede a Rimini. Supportiamo giovani imprenditori nello sviluppo di idee innovative, offrendo spazi di coworking, mentorship e accesso a investitori.',
    team: [
      { name: 'Andrea Costa', role: 'Data Science Lead', email: 'andrea.costa@innovate.it' },
      { name: 'Martina Romano', role: 'AI Researcher', email: 'martina.romano@innovate.it' },
    ],
    daysAgo: 7,
    LogoIcon: Lightbulb,
    logoColor: 'bg-violet-500',
  },
  {
    id: 'job_startup_biz',
    title: 'Business Developer',
    companyName: 'Startup Factory',
    sector: 'Startup',
    location: 'Rimini, Emilia Romagna',
    workMode: 'Ibrido',
    description: 'Sviluppa nuove partnership e opportunità di business per le startup in accelerazione. Parteciperai a pitch, eventi di networking e incontri con investitori, acquisendo competenze commerciali di alto livello.',
    benefits: ['Accesso al network di investitori', 'Formazione su pitch e storytelling', 'Demo Day annuale', 'Mentorship personalizzata'],
    requirements: 'Spirito imprenditoriale e ottime capacità comunicative. Nessun requisito tecnico specifico. Voglia di mettersi in gioco.',
    companyDescription: 'Startup Factory è un acceleratore con focus su progetti tech e sostenibili. Selezioniamo i progetti più promettenti del territorio.',
    team: [
      { name: 'Francesco Rinaldi', role: 'CEO', email: 'f.rinaldi@startupfactory.it' },
      { name: 'Elena Vitale', role: 'Startup Coach', email: 'e.vitale@startupfactory.it' },
    ],
    daysAgo: 2,
    LogoIcon: Rocket,
    logoColor: 'bg-pink-500',
  },
  {
    id: 'job_green_analyst',
    title: 'Sustainability Analyst',
    companyName: 'GreenFuture RN',
    sector: 'Sostenibilità',
    location: 'Rimini, Emilia Romagna',
    workMode: 'In Sede',
    description: 'Contribuisci alla transizione ecologica delle imprese del territorio. Analizzerai impatti ambientali, supporterai la redazione di report ESG e lavorerai a contatto con professionisti della sostenibilità.',
    benefits: ['Impatto ambientale reale misurabile', 'Formazione su normativa ESG', 'Accesso a tool di carbon accounting', 'Network con esperti di sostenibilità'],
    requirements: 'Interesse per le tematiche ambientali. Conoscenza base di Excel e analisi dati. Diploma o iscrizione a corso universitario.',
    companyDescription: 'GreenFuture RN è una società di consulenza specializzata in sostenibilità ambientale e transizione ecologica per imprese e PA.',
    team: [
      { name: 'Alessia Moretti', role: 'Sustainability Director', email: 'a.moretti@greenfuture.it' },
      { name: 'Davide Gallo', role: 'ESG Analyst', email: 'd.gallo@greenfuture.it' },
    ],
    daysAgo: 4,
    LogoIcon: Leaf,
    logoColor: 'bg-teal-500',
  },
];

const SECTOR_OPTIONS = ['Tutti i settori', 'Tecnologia', 'Design', 'Marketing', 'Innovazione', 'Startup', 'Sostenibilità'];
const WORKMODE_OPTIONS = ['Tutte le modalità', 'In Sede', 'Remoto', 'Ibrido'];

type DetailTab = 'dettagli' | 'azienda' | 'contatti';

const TAB_LABELS: Record<DetailTab, string> = {
  dettagli: 'Dettagli',
  azienda: 'Info Azienda',
  contatti: 'Contatti',
};

// ── Card griglia 2 colonne ────────────────────────────────────────────────────
const JobCard: React.FC<{ job: JobPosition; onDetail: () => void }> = ({ job, onDetail }) => {
  const { LogoIcon } = job;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex flex-col">
      <div className="flex justify-center mb-3">
        <div className={`w-14 h-14 ${job.logoColor} rounded-2xl flex items-center justify-center shadow-sm`}>
          <LogoIcon size={26} strokeWidth={1.75} color="white" />
        </div>
      </div>

      <h3 className="font-bold text-gray-900 text-xs font-montserrat text-center leading-snug line-clamp-2 mb-1">
        {job.title}
      </h3>

      <p className="text-[10px] text-gray-400 text-center mb-2 truncate">{job.companyName}</p>

      <div className="flex justify-center mb-3">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-500">
          {job.sector}
        </span>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-1">
        <MapPin size={9} className="shrink-0" />
        <span className="truncate">{job.location.split(',')[0]} · {job.workMode}</span>
      </div>

      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mb-3">
        <Clock size={9} className="shrink-0" />
        <span>{job.daysAgo === 1 ? '1 giorno fa' : `${job.daysAgo} giorni fa`}</span>
      </div>

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
const JobDetail: React.FC<{
  job: JobPosition;
  isInterested: boolean;
  isSaved: boolean;
  onInterest: () => void;
  onSave: () => void;
  onBack: () => void;
}> = ({ job, isInterested, isSaved, onInterest, onSave, onBack }) => {
  const [tab, setTab] = useState<DetailTab>('dettagli');
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const { LogoIcon } = job;

  const handleInterestClick = () => {
    if (isInterested) {
      onInterest();
    } else {
      setShowModal(true);
    }
  };

  const handleConfirm = () => {
    onInterest();
    setShowModal(false);
    setShowBanner(true);
  };

  return (
    <div className="max-w-md mx-auto flex flex-col min-h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-xs text-gray-400 font-medium">
        <button onClick={onBack} className="flex items-center gap-1 text-orange-500 font-bold">
          <ChevronLeft size={14} /> Job Positions
        </button>
        <span>›</span>
        <span className="text-gray-500 truncate">{job.title}</span>
      </div>

      {/* Hero scuro */}
      <div className="mx-4">
        <div className="rounded-2xl bg-gradient-to-br from-gray-800 to-gray-950 h-44 flex flex-col items-center justify-center px-6 text-center gap-3">
          <h2 className="text-white font-bold font-montserrat text-xl leading-tight">{job.title}</h2>
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-gray-300 text-xs">
            <span className="flex items-center gap-1.5">
              <MapPin size={11} />
              {job.location} · {job.workMode}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} />
              {job.daysAgo === 1 ? '1 giorno fa' : `${job.daysAgo} giorni fa`}
            </span>
          </div>
        </div>
      </div>

      {/* Banner conferma interesse */}
      {showBanner && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mx-4 mt-3">
          <CheckCircle2 size={14} className="text-green-500 shrink-0" />
          <p className="text-xs font-semibold text-green-700 flex-1">Hai espresso interesse per questa job position</p>
          <button onClick={() => setShowBanner(false)} className="text-green-400 hover:text-green-600 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mx-4 mt-4">
        {(['dettagli', 'azienda', 'contatti'] as DetailTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-[10px] font-bold transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Contenuto tab */}
      <div className="flex-1 px-4 py-5 space-y-6">
        {tab === 'dettagli' && (
          <>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-2">Descrizione</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{job.description}</p>
            </div>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-3">Cosa porterai a casa</h3>
              <ul className="space-y-2.5">
                {job.benefits.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-2">Requisiti</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{job.requirements}</p>
            </div>
          </>
        )}

        {tab === 'azienda' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-12 h-12 ${job.logoColor} rounded-2xl flex items-center justify-center shadow-sm shrink-0`}>
                <LogoIcon size={22} strokeWidth={1.75} color="white" />
              </div>
              <div>
                <p className="font-bold font-montserrat text-gray-900 text-sm leading-tight">{job.companyName}</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-500">
                  {job.sector}
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-2">Chi siamo</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{job.companyDescription}</p>
            </div>
          </div>
        )}

        {tab === 'contatti' && (
          <div>
            <h3 className="font-bold font-montserrat text-gray-900 mb-4">La nostra squadra</h3>
            <ul className="space-y-3">
              {job.team.map((member, i) => (
                <li key={i} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{member.name}</p>
                    <p className="text-[11px] text-gray-400">{member.role}</p>
                    <p className="text-[11px] text-orange-500 truncate">{member.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer azioni */}
      <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex items-center gap-3">
        <button
          onClick={handleInterestClick}
          className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            isInterested
              ? 'bg-orange-100 text-orange-600 border-2 border-orange-200'
              : 'btn-primary-liquid'
          }`}
        >
          {isInterested && <Heart size={15} className="fill-orange-500" />}
          {isInterested ? 'Mi piace' : 'Mi interessa'}
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

      {/* Bottom Sheet — Conferma Interesse */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div
            className="relative bg-white rounded-t-3xl px-6 pt-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            <h3 className="font-bold font-montserrat text-gray-900 text-lg mb-1.5">Conferma Interesse</h3>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              Vuoi confermare l'interesse per l'offerta di lavoro pubblicata?
            </p>

            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Ruolo Pubblicato</p>
                <p className="text-sm font-semibold text-gray-900">{job.title}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Azienda</p>
                <p className="text-sm font-semibold text-gray-900">{job.companyName}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3.5 rounded-2xl btn-primary-liquid text-sm font-bold"
              >
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
}

export const JobPage: React.FC<JobPageProps> = ({ onDetailChange }) => {
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterSector, setFilterSector] = useState('Tutti i settori');
  const [filterWorkMode, setFilterWorkMode] = useState('Tutte le modalità');
  const [toast, setToast] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const openDetail = (job: JobPosition) => { setSelectedJob(job); onDetailChange?.(true); };
  const closeDetail = () => { setSelectedJob(null); onDetailChange?.(false); };

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

  const handleInterest = (job: JobPosition) => {
    const wasInterested = interestedIds.includes(job.id);
    setInterestedIds(prev => wasInterested ? prev.filter(id => id !== job.id) : [...prev, job.id]);
    if (wasInterested) showToast('Interesse rimosso');
  };

  const handleSave = (job: JobPosition) => {
    const wasSaved = savedIds.includes(job.id);
    setSavedIds(prev => wasSaved ? prev.filter(id => id !== job.id) : [...prev, job.id]);
    showToast(wasSaved ? 'Rimosso dai salvati' : `${job.title} salvata`);
  };

  const filtered = JOB_POSITIONS.filter(j => {
    const matchSearch = search === '' ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.companyName.toLowerCase().includes(search.toLowerCase()) ||
      j.sector.toLowerCase().includes(search.toLowerCase());
    const matchSector = filterSector === 'Tutti i settori' || j.sector === filterSector;
    const matchWorkMode = filterWorkMode === 'Tutte le modalità' || j.workMode === filterWorkMode;
    return matchSearch && matchSector && matchWorkMode;
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
          isInterested={interestedIds.includes(selectedJob.id)}
          isSaved={savedIds.includes(selectedJob.id)}
          onInterest={() => handleInterest(selectedJob)}
          onSave={() => handleSave(selectedJob)}
          onBack={closeDetail}
        />
      ) : (
        <>
          {/* Header sticky */}
          <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-4 pb-3 relative">
            <div className="max-w-md mx-auto">
              <div className="mb-3">
                <h1 className="text-xl font-bold font-montserrat text-gray-900">Job Positions</h1>
                <p className="text-xs text-gray-400 mt-0.5">Trova l'opportunità giusta per te</p>
              </div>

              {/* Ricerca */}
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cerca..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-input text-sm"
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
                  value={filterWorkMode}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterWorkMode(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer"
                >
                  {WORKMODE_OPTIONS.map(o => <option key={o} value={o} className="bg-white">{o}</option>)}
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
                {filtered.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onDetail={() => openDetail(job)}
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
