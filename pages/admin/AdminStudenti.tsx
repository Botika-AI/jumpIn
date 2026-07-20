import React, { useState, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  school: string | null;
  dob: string | null;
  last_checkin: string | null; // ultimo aggiornamento (ultima scansione QR)
  last_access: string | null;  // ultimo login (da access_logs)
}

function getStatus(lastAccess: string | null) {
  if (!lastAccess) return { label: 'Inattivo', textColor: 'text-[#E05252]', bgColor: 'bg-[#FDEAEA]' };
  const days = (Date.now() - new Date(lastAccess).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 7)  return { label: 'Attivo',      textColor: 'text-[#34A853]',  bgColor: 'bg-[#E6F6EC]' };
  if (days < 30) return { label: 'Poco attivo', textColor: 'text-yellow-600', bgColor: 'bg-yellow-50'  };
  return             { label: 'Inattivo',    textColor: 'text-[#E05252]',  bgColor: 'bg-[#FDEAEA]' };
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('it-IT') : '—';
}

export const AdminStudenti: React.FC<{ onModifica?: (id: string) => void }> = ({ onModifica }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterCognome, setFilterCognome] = useState('');
  const [filterAnno, setFilterAnno]       = useState('');

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    const [profilesRes, logsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, first_name, last_name, school, dob, last_checkin')
        .eq('is_admin', false)
        .order('last_name', { ascending: true }),
      supabase
        .from('access_logs')
        .select('user_id, accessed_at')
        .order('accessed_at', { ascending: false }),
    ]);

    const profiles = profilesRes.data ?? [];
    const logs = logsRes.data ?? [];

    // Deduplica: prende solo l'accesso più recente per utente
    const lastAccessMap: Record<string, string> = {};
    for (const log of logs) {
      if (!lastAccessMap[log.user_id]) lastAccessMap[log.user_id] = log.accessed_at;
    }

    setStudents(profiles.map(p => ({ ...p, last_access: lastAccessMap[p.id] ?? null })));
    setLoading(false);
  };

  // Lista cognomi unici per il filtro
  const cognomi = [...new Set(students.map(s => s.last_name).filter(Boolean))].sort();
  // Lista anni di nascita unici
  const anni = [...new Set(
    students.map(s => s.dob ? new Date(s.dob).getFullYear().toString() : null).filter(Boolean)
  )].sort((a, b) => Number(b) - Number(a));

  const filtered = students.filter(s => {
    const name = `${s.first_name ?? ''} ${s.last_name ?? ''}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filterCognome && s.last_name !== filterCognome) return false;
    if (filterAnno && s.dob && new Date(s.dob).getFullYear().toString() !== filterAnno) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Utenti</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci tutti i profili e la loro attività</p>
        </div>
        <button className="flex items-center gap-2 bg-[#F0813C] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-orange-200 hover:bg-orange-500 transition-colors shrink-0">
          <span className="text-base leading-none font-bold">+</span> Aggiungi Studenti
        </button>
      </div>

      {/* Filtri */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
          <Search size={15} className="text-gray-300 shrink-0" />
          <input
            type="text"
            placeholder="Cerca..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-100 rounded-xl px-4 py-2.5 pr-8 text-sm text-gray-400 outline-none cursor-pointer"
            value={filterCognome}
            onChange={e => setFilterCognome(e.target.value)}
          >
            <option value="">Cognome...</option>
            {cognomi.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-100 rounded-xl px-4 py-2.5 pr-8 text-sm text-gray-400 outline-none cursor-pointer"
            value={filterAnno}
            onChange={e => setFilterAnno(e.target.value)}
          >
            <option value="">Anno nascita...</option>
            {anni.map(a => <option key={a} value={a!}>{a}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Nome', 'Scuola', 'Data di nascita', 'Stato', 'Ultimo accesso', 'Ultimo aggiornamento', 'Azioni'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-sm font-bold text-[#1F2430] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                  Nessuno studente trovato
                </td>
              </tr>
            ) : filtered.map((s, i) => {
              const status = getStatus(s.last_access);
              return (
                <tr
                  key={s.id}
                  className={i < filtered.length - 1 ? 'border-b border-gray-50' : ''}
                  style={{ height: 58 }}
                >
                  <td className="px-6 py-3 text-sm font-medium text-[#1F2430] whitespace-nowrap">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{s.school || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(s.dob)}</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${status.bgColor} ${status.textColor}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(s.last_access)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(s.last_checkin)}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => onModifica?.(s.id)}
                      className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors"
                    >
                      Modifica
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Contatore */}
      {!loading && (
        <p className="text-xs text-gray-400">
          {filtered.length} student{filtered.length === 1 ? 'e' : 'i'} trovat{filtered.length === 1 ? 'o' : 'i'}
          {students.length !== filtered.length && ` su ${students.length} totali`}
        </p>
      )}
    </div>
  );
};
