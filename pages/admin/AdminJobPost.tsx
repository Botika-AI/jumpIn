import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, Briefcase, ArrowLeft, User, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { JobPostForm } from './JobPostForm';

type Stato = 'attivo' | 'bozza' | 'chiuso';
type StatoCandidatura = 'in_attesa' | 'accettata' | 'rifiutata';

interface JobPost {
  id: string;
  titolo: string;
  modalita: string | null;
  deadline_candidature: string | null;
  stato: Stato;
  candidature_count: number;
  aziende: { name: string } | null;
}

interface Candidatura {
  id: string;
  user_id: string;
  stato: StatoCandidatura;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    school: string | null;
    email: string;
  } | null;
}

function StatoBadge({ stato }: { stato: Stato }) {
  const map = {
    attivo: { label: 'Attivo', bg: 'bg-[#E6F6EC]', text: 'text-[#34A853]' },
    bozza:  { label: 'Bozza',  bg: 'bg-[#FEF0E1]', text: 'text-[#F0813C]' },
    chiuso: { label: 'Chiuso', bg: 'bg-gray-100',   text: 'text-gray-500'  },
  };
  const s = map[stato] ?? map.chiuso;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function ModalitaBadge({ modalita }: { modalita: string | null }) {
  if (!modalita) return <span className="text-sm text-gray-400">—</span>;
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
      {modalita}
    </span>
  );
}

function CandidaturaBadge({ stato }: { stato: StatoCandidatura }) {
  const map = {
    in_attesa: { label: 'In attesa',  bg: 'bg-gray-100',   text: 'text-gray-500'  },
    accettata: { label: 'Accettata',  bg: 'bg-[#E6F6EC]',  text: 'text-[#34A853]' },
    rifiutata: { label: 'Rifiutata',  bg: 'bg-[#FDEAEA]',  text: 'text-[#E05252]' },
  };
  const s = map[stato];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function fmt(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

/* ── Vista candidature di un singolo job post ── */
const CandidatureView: React.FC<{ job: JobPost; onBack: () => void }> = ({ job, onBack }) => {
  const [search, setSearch]             = useState('');
  const [candidature, setCandidature]   = useState<Candidatura[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    supabase
      .from('job_applications')
      .select('id, user_id, stato, created_at, profiles(first_name, last_name, school, email)')
      .eq('job_position_id', job.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setCandidature((data ?? []) as unknown as Candidatura[]);
        setLoading(false);
      });
  }, [job.id]);

  const filtered = candidature.filter(c => {
    if (!search) return true;
    const name = `${c.profiles?.first_name ?? ''} ${c.profiles?.last_name ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="mt-1 p-1.5 text-gray-400 hover:text-gray-700 transition-colors shrink-0">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-[#FEF0E1] flex items-center justify-center shrink-0">
              <Briefcase size={11} className="text-[#F0813C]" />
            </div>
            <span className="text-sm text-gray-500">{job.titolo}</span>
          </div>
          <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Candidature</h1>
          <p className="text-sm text-gray-500 mt-1">{candidature.length} candidature ricevute per questo job post</p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 max-w-sm">
        <Search size={15} className="text-gray-300 shrink-0" />
        <input type="text" placeholder="Cerca candidato..."
          className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Candidato', 'Scuola', 'Data candidatura', 'Stato', 'Azioni'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-sm font-bold text-[#1F2430] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-16 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-16 text-center text-sm text-gray-400">
                {candidature.length === 0 ? 'Nessuna candidatura ricevuta' : 'Nessun candidato trovato'}
              </td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} className={i < filtered.length - 1 ? 'border-b border-gray-50' : ''} style={{ height: 58 }}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User size={13} className="text-gray-400" />
                    </div>
                    <span className="text-sm font-medium text-[#1F2430] whitespace-nowrap">
                      {c.profiles?.first_name} {c.profiles?.last_name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">{c.profiles?.school || '—'}</td>
                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(c.created_at.split('T')[0])}</td>
                <td className="px-6 py-3"><CandidaturaBadge stato={c.stato} /></td>
                <td className="px-6 py-3">
                  <button className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors">
                    Vedi profilo
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400">{filtered.length} candidat{filtered.length === 1 ? 'o' : 'i'} trovat{filtered.length === 1 ? 'o' : 'i'}</p>
      )}
    </div>
  );
};

/* ── Vista principale lista job post ── */
type View = 'list' | 'candidature' | 'create' | 'edit';

export const AdminJobPost: React.FC = () => {
  const [view, setView]               = useState<View>('list');
  const [editId, setEditId]           = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [jobs, setJobs]               = useState<JobPost[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterStato, setFilterStato] = useState('');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('job_positions')
      .select('id, titolo, modalita, deadline_candidature, stato, aziende(name)')
      .order('created_at', { ascending: false });

    const positions = (data ?? []) as unknown as Omit<JobPost, 'candidature_count'>[];

    // Conta candidature per ogni job
    const counts = await Promise.all(
      positions.map(j =>
        supabase.from('job_applications').select('id', { count: 'exact', head: true }).eq('job_position_id', j.id)
          .then(({ count }) => ({ id: j.id, count: count ?? 0 }))
      )
    );
    const countMap = Object.fromEntries(counts.map(c => [c.id, c.count]));

    setJobs(positions.map(j => ({ ...j, candidature_count: countMap[j.id] ?? 0 })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  if (view === 'create') {
    return <JobPostForm mode="create" onBack={() => setView('list')} onSaved={() => { setView('list'); fetchJobs(); }} />;
  }
  if (view === 'edit' && editId) {
    return <JobPostForm mode="edit" editId={editId} onBack={() => setView('list')} onSaved={() => { setView('list'); fetchJobs(); }} />;
  }
  if (view === 'candidature' && selectedJob) {
    return <CandidatureView job={selectedJob} onBack={() => setView('list')} />;
  }

  const filtered = jobs.filter(j => {
    if (search && !j.titolo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStato && j.stato !== filterStato) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Job Post</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci le offerte di lavoro pubblicate su Jump'in</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="flex items-center gap-2 bg-[#F0813C] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-orange-200 hover:bg-orange-500 transition-colors shrink-0"
        >
          <span className="text-base leading-none font-bold">+</span> Crea nuovo job post
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
          <Search size={15} className="text-gray-300 shrink-0" />
          <input type="text" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1" />
        </div>

        <div className="relative">
          <select className="appearance-none bg-white border border-gray-100 rounded-xl px-4 py-2.5 pr-8 text-sm text-gray-400 outline-none cursor-pointer"
            value={filterStato} onChange={e => setFilterStato(e.target.value)}>
            <option value="">Stato...</option>
            <option value="attivo">Attivo</option>
            <option value="bozza">Bozza</option>
            <option value="chiuso">Chiuso</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Titolo', 'Modalità', 'Deadline', 'Stato', 'Candidature', 'Azioni'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-sm font-bold text-[#1F2430] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-16 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-sm text-gray-400">
                {jobs.length === 0
                  ? 'Nessun job post. Clicca "+ Crea nuovo job post" per iniziare.'
                  : 'Nessun risultato con i filtri selezionati.'}
              </td></tr>
            ) : filtered.map((j, i) => (
              <tr key={j.id} className={i < filtered.length - 1 ? 'border-b border-gray-50' : ''} style={{ height: 58 }}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FEF0E1] flex items-center justify-center shrink-0">
                      <Briefcase size={13} className="text-[#F0813C]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1F2430] whitespace-nowrap">{j.titolo}</p>
                      {j.aziende?.name && (
                        <p className="text-xs text-gray-400">{j.aziende.name}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3"><ModalitaBadge modalita={j.modalita} /></td>
                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(j.deadline_candidature)}</td>
                <td className="px-6 py-3"><StatoBadge stato={j.stato} /></td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => { setSelectedJob(j); setView('candidature'); }}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors group"
                  >
                    <Users size={13} className="text-gray-400 group-hover:text-orange-400 shrink-0" />
                    {j.candidature_count} candidatur{j.candidature_count === 1 ? 'a' : 'e'}
                  </button>
                </td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => { setEditId(j.id); setView('edit'); }}
                    className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors"
                  >
                    Modifica
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && jobs.length > 0 && (
        <p className="text-xs text-gray-400">
          {filtered.length} job post trovat{filtered.length === 1 ? 'o' : 'i'}
          {jobs.length !== filtered.length && ` su ${jobs.length} totali`}
        </p>
      )}
    </div>
  );
};
