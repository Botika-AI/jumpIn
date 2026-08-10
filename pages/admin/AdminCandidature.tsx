import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, Check, X, Download, Calendar, Briefcase, Users, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Tipi ─────────────────────────────────────────────────────────────────────

type Tab = 'eventi' | 'jobpost';
type View = 'list' | 'detail';
type StatoCandidatura = 'in_attesa' | 'accettata' | 'rifiutata';

interface EventoRow {
  id: string;
  name: string;
  event_date: string;
  event_end: string | null;
  tipo: string | null;
  stato: string | null;
  iscrizioni_count: number;
}

interface JobRow {
  id: string;
  titolo: string;
  modalita: string | null;
  deadline_candidature: string | null;
  stato: 'attivo' | 'bozza' | 'chiuso';
  aziende: { name: string } | null;
  candidature_count: number;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateRange(inizio: string, fine: string | null) {
  if (!fine || fine === inizio) return fmtDate(inizio);
  const i = new Date(inizio + 'T00:00:00');
  const f = new Date(fine   + 'T00:00:00');
  if (i.getMonth() === f.getMonth() && i.getFullYear() === f.getFullYear())
    return `${i.getDate()}-${f.getDate()} ${f.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`;
  return `${fmtDate(inizio)} – ${fmtDate(fine)}`;
}

function ModalitaBadge({ modalita }: { modalita: string | null }) {
  if (!modalita) return <span className="text-sm text-gray-400">—</span>;
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
      {modalita}
    </span>
  );
}

function JobStatoBadge({ stato }: { stato: 'attivo' | 'bozza' | 'chiuso' }) {
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

function EventoStatoBadge({ stato }: { stato: string | null }) {
  const isBozza = stato === 'bozza';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isBozza ? 'bg-orange-50 text-orange-400' : 'bg-[#E6F6EC] text-[#34A853]'}`}>
      {isBozza ? 'Bozza' : 'Pubblicato'}
    </span>
  );
}

function StatoCandidaturaBadge({ stato }: { stato: StatoCandidatura }) {
  const map: Record<StatoCandidatura, { label: string; bg: string; text: string }> = {
    in_attesa: { label: 'In attesa', bg: 'bg-orange-50', text: 'text-orange-500' },
    accettata: { label: 'Accettata', bg: 'bg-green-50',  text: 'text-green-600'  },
    rifiutata: { label: 'Rifiutata', bg: 'bg-red-50',    text: 'text-red-500'    },
  };
  const s = map[stato];
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function CandidaturaBadge({ stato }: { stato: StatoCandidatura }) {
  const map: Record<StatoCandidatura, { label: string; bg: string; text: string }> = {
    in_attesa: { label: 'In attesa', bg: 'bg-gray-100',  text: 'text-gray-500'   },
    accettata: { label: 'Accettata', bg: 'bg-[#E6F6EC]', text: 'text-[#34A853]'  },
    rifiutata: { label: 'Rifiutata', bg: 'bg-[#FDEAEA]', text: 'text-[#E05252]'  },
  };
  const s = map[stato];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Dettaglio eventi (con accetta/rifiuta) ────────────────────────────────────

interface EventoDetailProps {
  entityId: string;
  titolo: string;
  nomeEntita: string;
  onBack: () => void;
}

const EventoDetailView: React.FC<EventoDetailProps> = ({ entityId, titolo, nomeEntita, onBack }) => {
  const [candidature, setCandidature] = useState<Candidatura[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');

  useEffect(() => {
    supabase
      .from('iscrizioni_eventi')
      .select('id, user_id, stato, created_at, profiles(first_name, last_name, school, email)')
      .eq('event_id', entityId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setCandidature((data ?? []) as unknown as Candidatura[]);
        setLoading(false);
      });
  }, [entityId]);

  const inAttesa  = candidature.filter(c => c.stato === 'in_attesa').length;
  const accettate = candidature.filter(c => c.stato === 'accettata').length;
  const rifiutate = candidature.filter(c => c.stato === 'rifiutata').length;

  const updateStato = async (id: string, stato: StatoCandidatura) => {
    await supabase.from('iscrizioni_eventi').update({ stato }).eq('id', id);
    setCandidature(prev => prev.map(c => c.id === id ? { ...c, stato } : c));
    const cand = candidature.find(c => c.id === id);
    if (cand && (stato === 'accettata' || stato === 'rifiutata')) {
      await supabase.from('notifiche').insert({
        user_id:        cand.user_id,
        tipo:           'evento',
        titolo:         stato === 'accettata' ? 'Iscrizione accettata' : 'Iscrizione rifiutata',
        corpo:          stato === 'accettata'
          ? `La tua iscrizione a "${nomeEntita}" è stata accettata. Ci vediamo lì!`
          : `La tua iscrizione a "${nomeEntita}" non è stata accettata questa volta.`,
        riferimento_id: entityId,
      });
    }
  };

  const bulkUpdate = async (stato: StatoCandidatura) => {
    const targets = candidature.filter(c => c.stato === 'in_attesa');
    if (targets.length === 0) return;
    await supabase.from('iscrizioni_eventi').update({ stato }).in('id', targets.map(c => c.id));
    setCandidature(prev => prev.map(c => c.stato === 'in_attesa' ? { ...c, stato } : c));
    await Promise.all(targets.map(c =>
      supabase.from('notifiche').insert({
        user_id:        c.user_id,
        tipo:           'evento',
        titolo:         stato === 'accettata' ? 'Iscrizione accettata' : 'Iscrizione rifiutata',
        corpo:          stato === 'accettata'
          ? `La tua iscrizione a "${nomeEntita}" è stata accettata. Ci vediamo lì!`
          : `La tua iscrizione a "${nomeEntita}" non è stata accettata questa volta.`,
        riferimento_id: entityId,
      })
    ));
  };

  const exportCSV = () => {
    const header = ['Nome', 'Cognome', 'Email', 'Scuola', 'Data candidatura', 'Stato'];
    const rows   = candidature.map(c => [
      c.profiles?.first_name ?? '', c.profiles?.last_name ?? '',
      c.profiles?.email ?? '', c.profiles?.school ?? '',
      fmt(c.created_at.split('T')[0]), c.stato,
    ]);
    const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `candidature_${entityId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = candidature.filter(c => {
    if (!search.trim()) return true;
    const name = `${c.profiles?.first_name ?? ''} ${c.profiles?.last_name ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase()) || (c.profiles?.email ?? '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors">
            <ArrowLeft size={14} />
            Torna alle candidature
          </button>
          <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">{titolo}</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci le candidature ricevute</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors shrink-0 self-start">
          <Download size={14} />
          Esporta CSV
        </button>
      </div>

      {!loading && inAttesa > 0 && (
        <div className="flex items-center justify-between gap-4 bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3 flex-wrap">
          <p className="text-sm font-semibold text-orange-700">
            Hai <span className="font-bold">{inAttesa}</span> candidatur{inAttesa === 1 ? 'a' : 'e'} in attesa di revisione
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => bulkUpdate('accettata')} className="px-4 py-1.5 rounded-xl text-sm font-bold text-white bg-green-500 hover:bg-green-600 transition-colors">Accetta tutte</button>
            <button onClick={() => bulkUpdate('rifiutata')} className="px-4 py-1.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">Rifiuta tutte</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Totale candidature', value: candidature.length, color: 'text-[#1F2430]' },
          { label: 'In attesa',          value: inAttesa,            color: 'text-orange-500' },
          { label: 'Accettate',          value: accettate,           color: 'text-green-500'  },
          { label: 'Rifiutate',          value: rifiutate,           color: 'text-red-500'    },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 mb-2">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 max-w-sm shadow-sm">
        <Search size={15} className="text-gray-300 shrink-0" />
        <input type="text" placeholder="Cerca studente..."
          className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Studente', 'Scuola', 'Data candidatura', 'Stato', 'Azioni'].map(h => (
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
                {candidature.length === 0 ? 'Nessuna candidatura ricevuta' : 'Nessun risultato'}
              </td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id} className={i < filtered.length - 1 ? 'border-b border-gray-50' : ''} style={{ height: 58 }}>
                <td className="px-6 py-3 text-sm font-medium text-[#1F2430]">
                  {[c.profiles?.first_name, c.profiles?.last_name].filter(Boolean).join(' ') || c.profiles?.email || '—'}
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">{c.profiles?.school || '—'}</td>
                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(c.created_at.split('T')[0])}</td>
                <td className="px-6 py-3"><StatoCandidaturaBadge stato={c.stato} /></td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    {c.stato === 'in_attesa' && (
                      <>
                        <button onClick={() => updateStato(c.id, 'accettata')} title="Accetta"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                          <Check size={13} />
                        </button>
                        <button onClick={() => updateStato(c.id, 'rifiutata')} title="Rifiuta"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                          <X size={13} />
                        </button>
                      </>
                    )}
                    <button className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors whitespace-nowrap">
                      Vedi profilo
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && candidature.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              {filtered.length} candidatur{filtered.length === 1 ? 'a' : 'e'} trovat{filtered.length === 1 ? 'a' : 'e'}
              {candidature.length !== filtered.length && ` su ${candidature.length} totali`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Dettaglio job post (sola lettura) ─────────────────────────────────────────

interface JobDetailProps {
  job: JobRow;
  onBack: () => void;
}

const JobDetailView: React.FC<JobDetailProps> = ({ job, onBack }) => {
  const [candidature, setCandidature] = useState<Candidatura[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');

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
    if (!search.trim()) return true;
    const name = `${c.profiles?.first_name ?? ''} ${c.profiles?.last_name ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-5xl">
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

// ── Lista eventi ──────────────────────────────────────────────────────────────

const EventiList: React.FC<{ onDetail: (ev: EventoRow) => void }> = ({ onDetail }) => {
  const [events, setEvents]   = useState<EventoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    supabase
      .from('events')
      .select('id, name, event_date, event_end, tipo, stato, iscrizioni_eventi(count)')
      .order('event_date', { ascending: false })
      .then(({ data }) => {
        setEvents((data ?? []).map((e: any) => ({
          ...e,
          iscrizioni_count: e.iscrizioni_eventi?.[0]?.count ?? 0,
        })));
        setLoading(false);
      });
  }, []);

  const filtered = events.filter(e =>
    !search.trim() || e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 max-w-sm shadow-sm">
        <Search size={15} className="text-gray-300 shrink-0" />
        <input type="text" placeholder="Cerca evento..."
          className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Titolo', 'Tipo', 'Data', 'Stato', 'Candidature'].map(h => (
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
                {events.length === 0 ? 'Nessun evento trovato' : 'Nessun risultato'}
              </td></tr>
            ) : filtered.map((ev, i) => (
              <tr key={ev.id} className={i < filtered.length - 1 ? 'border-b border-gray-50' : ''} style={{ height: 60 }}>
                <td className="px-6 py-3">
                  <span className="text-sm font-medium text-[#1F2430]">{ev.name}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {ev.tipo || '—'}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {fmtDateRange(ev.event_date, ev.event_end)}
                </td>
                <td className="px-6 py-3"><EventoStatoBadge stato={ev.stato} /></td>
                <td className="px-6 py-3">
                  <button onClick={() => onDetail(ev)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors group">
                    <Users size={13} className="text-gray-400 group-hover:text-orange-400 shrink-0" />
                    {ev.iscrizioni_count} candidature
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && events.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              {filtered.length} event{filtered.length === 1 ? 'o' : 'i'} trovat{filtered.length === 1 ? 'o' : 'i'}
              {events.length !== filtered.length && ` su ${events.length} totali`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Lista job post ────────────────────────────────────────────────────────────

const JobList: React.FC<{ onDetail: (job: JobRow) => void }> = ({ onDetail }) => {
  const [jobs, setJobs]       = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('job_positions')
        .select('id, titolo, modalita, deadline_candidature, stato, aziende(name)')
        .order('created_at', { ascending: false });

      if (!data) { setLoading(false); return; }

      const counts = await Promise.all(
        (data as any[]).map(j =>
          supabase
            .from('job_applications')
            .select('id', { count: 'exact', head: true })
            .eq('job_position_id', j.id)
            .then(({ count }) => ({ id: j.id, count: count ?? 0 }))
        )
      );
      const countMap = Object.fromEntries(counts.map(c => [c.id, c.count]));

      setJobs((data as any[]).map(j => ({ ...j, candidature_count: countMap[j.id] ?? 0 })));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = jobs.filter(j =>
    !search.trim() || j.titolo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 max-w-sm shadow-sm">
        <Search size={15} className="text-gray-300 shrink-0" />
        <input type="text" placeholder="Cerca annuncio..."
          className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Titolo', 'Modalità', 'Deadline', 'Stato', 'Candidature'].map(h => (
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
                {jobs.length === 0 ? 'Nessun annuncio trovato' : 'Nessun risultato'}
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
                <td className="px-6 py-3"><JobStatoBadge stato={j.stato} /></td>
                <td className="px-6 py-3">
                  <button onClick={() => onDetail(j)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors group">
                    <Users size={13} className="text-gray-400 group-hover:text-orange-400 shrink-0" />
                    {j.candidature_count} candidatur{j.candidature_count === 1 ? 'a' : 'e'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && jobs.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              {filtered.length} job post trovat{filtered.length === 1 ? 'o' : 'i'}
              {jobs.length !== filtered.length && ` su ${jobs.length} totali`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Componente principale ─────────────────────────────────────────────────────

export const AdminCandidature: React.FC = () => {
  const [tab, setTab]                       = useState<Tab>('eventi');
  const [view, setView]                     = useState<View>('list');
  const [selectedEvento, setSelectedEvento] = useState<EventoRow | null>(null);
  const [selectedJob, setSelectedJob]       = useState<JobRow | null>(null);

  const backToList = () => {
    setView('list');
    setSelectedEvento(null);
    setSelectedJob(null);
  };

  if (view === 'detail' && selectedEvento) {
    return (
      <EventoDetailView
        entityId={selectedEvento.id}
        titolo={`Candidature: ${selectedEvento.name}`}
        nomeEntita={selectedEvento.name}
        onBack={backToList}
      />
    );
  }

  if (view === 'detail' && selectedJob) {
    return <JobDetailView job={selectedJob} onBack={backToList} />;
  }

  return (
    <div className="max-w-5xl space-y-6">

      <div>
        <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Panoramica delle candidature</h1>
        <p className="text-sm text-gray-500 mt-1">Vista centralizzata di tutte le candidature della piattaforma</p>
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setTab('eventi'); setView('list'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'eventi'
              ? 'bg-[#FEF0E1] text-[#F0813C]'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Calendar size={15} />
          Eventi / Esperienze
        </button>
        <button
          onClick={() => { setTab('jobpost'); setView('list'); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'jobpost'
              ? 'bg-[#FEF0E1] text-[#F0813C]'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Briefcase size={15} />
          Annunci di lavoro
        </button>
      </div>

      {tab === 'eventi' && (
        <EventiList onDetail={ev => { setSelectedEvento(ev); setView('detail'); }} />
      )}
      {tab === 'jobpost' && (
        <JobList onDetail={job => { setSelectedJob(job); setView('detail'); }} />
      )}
    </div>
  );
};
