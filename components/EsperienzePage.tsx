import React, { useState, useEffect, useRef } from 'react';
import { Search, CalendarDays, MapPin, Users, ChevronLeft, CheckCircle2, X, BookOpen, UserCircle2, SlidersHorizontal } from 'lucide-react';

interface Experience {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  tags: string[];
  dateRange: string;
  modalDate: string;
  location: string;
  enrolled: number;
  total: number;
  gradient: string;
  accentFrom: string;
  takeaways: string[];
  requirements: string;
}

const EXPERIENCES: Experience[] = [
  {
    id: 'ai_hackathon_2025',
    title: 'AI Hackathon Milano 2025',
    description: '48 ore di coding intensivo per creare soluzioni AI innovative. Premio di €5.000.',
    fullDescription: "Unisciti a noi per 48 ore di coding intensivo! Crea soluzioni AI innovative insieme ad altri appassionati di tecnologia. Il team vincitore riceverà un premio di €5.000 e la possibilità di presentare il progetto a importanti aziende del settore tech.",
    tags: ['AI', 'Hackathon', 'Team'],
    dateRange: '15-17 Nov 2025',
    modalDate: '15-17 Novembre 2025',
    location: 'Milano, Politecnico',
    enrolled: 45,
    total: 60,
    gradient: 'from-orange-400 to-orange-600',
    accentFrom: '#fb923c',
    takeaways: ['Badge "AI Innovator"', 'Attestato di partecipazione', 'Network con professionisti del settore', 'Accesso esclusivo a risorse e tool AI'],
    requirements: "Conoscenza base di Python, passione per l'AI e tanta voglia di imparare! Il laptop è necessario.",
  },
  {
    id: 'design_thinking_101',
    title: 'Workshop: Design Thinking 101',
    description: 'Impara le basi del design thinking con esperti del settore.',
    fullDescription: 'Un workshop intensivo per scoprire le metodologie del design thinking applicate a progetti reali. Lavorerai in team per sviluppare soluzioni innovative a problemi concreti.',
    tags: ['Design', 'Workshop'],
    dateRange: '22 Nov 2025',
    modalDate: '22 Novembre 2025',
    location: 'Online',
    enrolled: 120,
    total: 150,
    gradient: 'from-violet-500 to-purple-600',
    accentFrom: '#8b5cf6',
    takeaways: ['Certificato di partecipazione', 'Template e strumenti Design Thinking', 'Accesso alla community di designer'],
    requirements: 'Nessun requisito tecnico. Curiosità e voglia di collaborare sono sufficienti.',
  },
  {
    id: 'robotica_lab',
    title: 'Laboratorio Robotica Avanzata',
    description: 'Costruisci e programma il tuo robot con Arduino e Raspberry Pi.',
    fullDescription: 'Tre giornate di laboratorio pratico in cui costruirai e programmerai robot autonomi usando Arduino e Raspberry Pi. Le sessioni alternano teoria e pratica, con una gara finale tra i team.',
    tags: ['Robotica', 'Hands-on'],
    dateRange: '1-3 Dic 2025',
    modalDate: '1-3 Dicembre 2025',
    location: 'Torino, FabLab',
    enrolled: 18,
    total: 24,
    gradient: 'from-blue-500 to-cyan-500',
    accentFrom: '#3b82f6',
    takeaways: ['Badge "Robotics Builder"', 'Progetto personale da portare a casa', 'Accesso alla community maker'],
    requirements: 'Conoscenza base di elettronica. Il materiale è fornito dal laboratorio.',
  },
  {
    id: 'game_dev_bootcamp',
    title: 'Game Development Bootcamp',
    description: "Crea il tuo primo videogioco in 3 giorni con Unity.",
    fullDescription: "Bootcamp intensivo di sviluppo videogiochi con Unity. Dalla struttura di gioco alla pubblicazione, scoprirai tutti i segreti del game dev con mentori professionisti dell'industria.",
    tags: ['Gaming', 'Bootcamp'],
    dateRange: '10-12 Dic 2025',
    modalDate: '10-12 Dicembre 2025',
    location: 'Roma, Campus',
    enrolled: 35,
    total: 40,
    gradient: 'from-green-500 to-emerald-600',
    accentFrom: '#22c55e',
    takeaways: ['Gioco pubblicato su itch.io', 'Badge "Game Developer"', 'Portfolio pronto per candidature'],
    requirements: 'Nessuna esperienza necessaria. Laptop con almeno 8GB RAM richiesto.',
  },
];

const CATEGORY_OPTIONS = ['Tutte', 'AI', 'Design', 'Robotica', 'Gaming', 'Workshop', 'Hackathon', 'Bootcamp'];
const STATUS_OPTIONS = ['Tutti', 'Iscrizioni Aperte', 'Confermato'];
type DetailTab = 'dettagli' | 'materiali' | 'team';

// ── Card verticale (Lista) ────────────────────────────────────────────────────
const ListCard: React.FC<{
  exp: Experience;
  isEnrolled: boolean;
  onEnroll: () => void;
  onDetail: () => void;
}> = ({ exp, isEnrolled, onEnroll, onDetail }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
    {/* Titolo + badge */}
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <h3 className="font-bold text-gray-900 text-sm font-montserrat leading-snug flex-1">
        {exp.title}
      </h3>
      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
        isEnrolled ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500'
      }`}>
        {isEnrolled ? 'Confermato' : 'Aperte'}
      </span>
    </div>

    {/* Descrizione */}
    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2.5">{exp.description}</p>

    {/* Meta su una riga */}
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 font-medium mb-3">
      <span className="flex items-center gap-1"><CalendarDays size={11} />{exp.dateRange}</span>
      <span className="flex items-center gap-1"><MapPin size={11} />{exp.location}</span>
      <span className="flex items-center gap-1"><Users size={11} />{exp.enrolled}/{exp.total}</span>
    </div>

    {/* Azioni */}
    <div className="flex items-center gap-2">
      {isEnrolled ? (
        <span className="text-xs font-bold text-green-600 flex items-center gap-1">
          <CheckCircle2 size={13} /> Iscritto
        </span>
      ) : (
        <button onClick={onEnroll} className="px-4 py-2 rounded-xl btn-primary-liquid text-xs font-bold">
          Partecipa
        </button>
      )}
      <button onClick={onDetail} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:border-gray-300 transition-colors">
        Dettagli
      </button>
    </div>
  </div>
);

// ── Vista dettaglio ───────────────────────────────────────────────────────────
const ExperienceDetail: React.FC<{
  exp: Experience;
  isEnrolled: boolean;
  onEnroll: () => void;
  onCancel: () => void;
  onBack: () => void;
}> = ({ exp, isEnrolled, onEnroll, onCancel, onBack }) => {
  const [tab, setTab] = useState<DetailTab>('dettagli');

  return (
    <div className="max-w-md mx-auto flex flex-col min-h-full">
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-xs text-gray-400 font-medium">
        <button onClick={onBack} className="flex items-center gap-1 text-orange-500 font-bold">
          <ChevronLeft size={14} /> Esperienze
        </button>
        <span>›</span>
        <span className="text-gray-500 truncate">{exp.title}</span>
      </div>

      {/* Hero + card peek */}
      <div className="relative mx-4">
        {/* Gradient hero — solo sfondo */}
        <div className={`rounded-2xl bg-gradient-to-br ${exp.gradient} h-40`} />

        {/* Card peek sovrapposta */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 pt-4 pb-4 -mt-6 relative z-10">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h2 className="font-bold font-montserrat text-gray-900 text-lg leading-snug flex-1">
              {exp.title}
            </h2>
            {isEnrolled && (
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                Confermato
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1.5"><CalendarDays size={12} />{exp.modalDate}</span>
            <span className="flex items-center gap-1.5"><MapPin size={12} />{exp.location}</span>
            <span className="flex items-center gap-1.5"><Users size={12} />{exp.enrolled}/{exp.total} partecipanti</span>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-100 mx-4 mt-4">
        {(['dettagli', 'materiali', 'team'] as DetailTab[]).map(t => (
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

      <div className="flex-1 px-4 py-5 space-y-6">
        {tab === 'dettagli' && (
          <>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-2">Descrizione</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{exp.fullDescription}</p>
            </div>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-3">Cosa porterai a casa</h3>
              <ul className="space-y-2.5">
                {exp.takeaways.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />{item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold font-montserrat text-gray-900 mb-2">Requisiti</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{exp.requirements}</p>
            </div>
          </>
        )}
        {tab === 'materiali' && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <BookOpen size={24} className="text-gray-400" />
            </div>
            <p className="font-bold font-montserrat text-gray-700">
              {isEnrolled ? 'Nessun materiale disponibile' : 'Materiali non ancora disponibili'}
            </p>
            <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
              {isEnrolled
                ? "I materiali saranno caricati qualche giorno prima dell'evento."
                : 'Le risorse sono visibili solo ai partecipanti. Iscriviti per accedere a tutti i materiali.'}
            </p>
            {!isEnrolled && (
              <button onClick={onEnroll} className="mt-2 px-6 py-2.5 rounded-xl btn-primary-liquid text-sm font-bold">
                Iscriviti ora
              </button>
            )}
          </div>
        )}
        {tab === 'team' && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <UserCircle2 size={24} className="text-gray-400" />
            </div>
            <p className="font-bold font-montserrat text-gray-700">Formazione team</p>
            <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
              I team saranno formati il primo giorno dell'evento. Troverai i tuoi compagni di squadra all'arrivo.
            </p>
          </div>
        )}
      </div>

      <div className="px-4 pb-6 pt-3 border-t border-gray-100 flex items-center gap-3">
        {isEnrolled ? (
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
            <button onClick={onBack} className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-600">
              Indietro
            </button>
            <button onClick={onEnroll} className="flex-1 py-3.5 rounded-2xl btn-primary-liquid font-bold text-sm">
              Partecipa
            </button>
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
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [selectedExp, setSelectedExp] = useState<Experience | null>(null);

  const openDetail = (exp: Experience) => { setSelectedExp(exp); onDetailChange?.(true); };
  const closeDetail = () => { setSelectedExp(null); onDetailChange?.(false); };
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Tutte');
  const [filterStatus, setFilterStatus] = useState('Tutti');
  const [confirmEnroll, setConfirmEnroll] = useState<Experience | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Experience | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  const handleEnroll = (exp: Experience) => {
    setEnrolledIds(prev => [...prev, exp.id]);
    setConfirmEnroll(null);
    showToast(`Iscrizione confermata: ${exp.title}`);
  };

  const handleCancel = (exp: Experience) => {
    setEnrolledIds(prev => prev.filter(id => id !== exp.id));
    setConfirmCancel(null);
    closeDetail();
    showToast('Iscrizione cancellata');
  };

  const filtered = EXPERIENCES.filter(exp => {
    const matchSearch = search === '' ||
      exp.title.toLowerCase().includes(search.toLowerCase()) ||
      exp.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filterCategory === 'Tutte' || exp.tags.includes(filterCategory);
    const matchStatus = filterStatus === 'Tutti' ||
      (filterStatus === 'Confermato' && enrolledIds.includes(exp.id)) ||
      (filterStatus === 'Iscrizioni Aperte' && !enrolledIds.includes(exp.id));
    return matchSearch && matchCategory && matchStatus;
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

      {selectedExp ? (
        <ExperienceDetail
          exp={selectedExp}
          isEnrolled={enrolledIds.includes(selectedExp.id)}
          onEnroll={() => setConfirmEnroll(selectedExp)}
          onCancel={() => setConfirmCancel(selectedExp)}
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

          {/* Ricerca */}
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cerca..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-input text-sm"
            />
          </div>

          {/* Filtri */}
          <div className="flex gap-2 mb-5">
            <div className="relative flex-1">
              <SlidersHorizontal size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer"
              >
                {CATEGORY_OPTIONS.map(o => <option key={o} value={o} className="bg-white">{o}</option>)}
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer"
            >
              {STATUS_OPTIONS.map(o => <option key={o} value={o} className="bg-white">{o}</option>)}
            </select>
          </div>
            </div>
            {scrolled && (
              <div className="absolute left-0 right-0 bottom-0 translate-y-full h-6 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none" />
            )}
          </div>

          <div className="max-w-md mx-auto px-4 pb-4">
          <div ref={sentinelRef} className="h-px" />
          {/* Lista verticale */}
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map(exp => (
                <ListCard
                  key={exp.id}
                  exp={exp}
                  isEnrolled={enrolledIds.includes(exp.id)}
                  onEnroll={() => setConfirmEnroll(exp)}
                  onDetail={() => openDetail(exp)}
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

      {/* Modal iscrizione */}
      {confirmEnroll && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-bold font-montserrat text-gray-900 pr-2">Conferma partecipazione</h3>
              <button onClick={() => setConfirmEnroll(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">Sei sicuro di voler partecipare a "{confirmEnroll.title}"?</p>
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2.5 text-sm text-gray-500"><CalendarDays size={15} className="text-gray-400 shrink-0" />{confirmEnroll.modalDate}</div>
              <div className="flex items-center gap-2.5 text-sm text-gray-500"><MapPin size={15} className="text-gray-400 shrink-0" />{confirmEnroll.location}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleEnroll(confirmEnroll)} className="flex-1 py-3.5 rounded-2xl btn-primary-liquid font-bold text-sm">Conferma</button>
              <button onClick={() => setConfirmEnroll(null)} className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-600">Annulla</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cancellazione */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-bold font-montserrat text-gray-900 pr-2">Cancella Partecipazione</h3>
              <button onClick={() => setConfirmCancel(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">Sei sicuro di voler cancellare la tua partecipazione a "{confirmCancel.title}"?</p>
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2.5 text-sm text-gray-500"><CalendarDays size={15} className="text-gray-400 shrink-0" />{confirmCancel.modalDate}</div>
              <div className="flex items-center gap-2.5 text-sm text-gray-500"><MapPin size={15} className="text-gray-400 shrink-0" />{confirmCancel.location}</div>
            </div>
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
