import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AggiungiAzienda } from './AggiungiAzienda';
import { AziendaModal } from './AziendaModal';

interface Azienda {
  id: string;
  name: string;
  settore: string | null;
  piano: 'free' | 'premium';
  stato: 'attivo' | 'disattivo';
  last_access: string | null;
}

function PianoBadge({ piano }: { piano: string }) {
  const isPremium = piano === 'premium';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
      isPremium ? 'bg-[#FDEBD8] text-[#F0813C]' : 'bg-gray-100 text-gray-500'
    }`}>
      {isPremium ? 'Premium' : 'Free'}
    </span>
  );
}

function StatoBadge({ stato }: { stato: string }) {
  const isAttivo = stato === 'attivo';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
      isAttivo ? 'bg-[#E6F6EC] text-[#34A853]' : 'bg-[#FDEAEA] text-[#E05252]'
    }`}>
      {isAttivo ? 'Attivo' : 'Disattivo'}
    </span>
  );
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString('it-IT') : '—';
}

interface Props {}

export const AdminAziende: React.FC<Props> = () => {
  const [view, setView]                   = useState<'list' | 'add'>('list');
  const [aziende, setAziende]             = useState<Azienda[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [filterSettore, setFilterSettore] = useState('');
  const [filterAccesso, setFilterAccesso] = useState('');
  const [modalId, setModalId]             = useState<string | null>(null);

  const fetchAziende = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('aziende')
      .select('id, name, settore, piano, stato, last_access')
      .order('name', { ascending: true });
    setAziende((data ?? []) as Azienda[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAziende(); }, [fetchAziende]);

  if (view === 'add') {
    return (
      <AggiungiAzienda
        onBack={() => setView('list')}
        onCreated={() => { setView('list'); fetchAziende(); }}
      />
    );
  }

  const settori = [...new Set(aziende.map(a => a.settore).filter(Boolean))].sort() as string[];

  const filtered = aziende.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSettore && a.settore !== filterSettore) return false;
    if (filterAccesso === 'premium' && a.piano !== 'premium') return false;
    if (filterAccesso === 'free' && a.piano !== 'free') return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Aziende registrate</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci tutte le aziende e le richieste di partnership</p>
        </div>
        <button
          onClick={() => setView('add')}
          className="flex items-center gap-2 bg-[#F0813C] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-orange-200 hover:bg-orange-500 transition-colors shrink-0"
        >
          <span className="text-base leading-none font-bold">+</span> Aggiungi Azienda
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
            value={filterSettore}
            onChange={e => setFilterSettore(e.target.value)}
          >
            <option value="">Settore...</option>
            {settori.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-100 rounded-xl px-4 py-2.5 pr-8 text-sm text-gray-400 outline-none cursor-pointer"
            value={filterAccesso}
            onChange={e => setFilterAccesso(e.target.value)}
          >
            <option value="">Piano...</option>
            <option value="premium">Premium</option>
            <option value="free">Free</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Nome azienda', 'Settore', 'Piano', 'Stato', 'Ultimo accesso', 'Azioni'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-sm font-bold text-[#1F2430] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <p className="text-sm text-gray-400">
                    {aziende.length === 0
                      ? 'Nessuna azienda registrata. Usa "+ Aggiungi Azienda" per iniziare.'
                      : 'Nessuna azienda trovata con i filtri selezionati.'}
                  </p>
                </td>
              </tr>
            ) : filtered.map((a, i) => (
              <tr key={a.id} className={i < filtered.length - 1 ? 'border-b border-gray-50' : ''} style={{ height: 58 }}>
                <td className="px-6 py-3 text-sm font-medium text-[#1F2430] whitespace-nowrap">{a.name}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{a.settore || '—'}</td>
                <td className="px-6 py-3"><PianoBadge piano={a.piano} /></td>
                <td className="px-6 py-3"><StatoBadge stato={a.stato} /></td>
                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">{fmt(a.last_access)}</td>
                <td className="px-6 py-3">
                  <button
                    onClick={() => setModalId(a.id)}
                    className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors"
                  >
                    Apri
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && aziende.length > 0 && (
        <p className="text-xs text-gray-400">
          {filtered.length} aziend{filtered.length === 1 ? 'a' : 'e'} trovat{filtered.length === 1 ? 'a' : 'e'}
          {aziende.length !== filtered.length && ` su ${aziende.length} totali`}
        </p>
      )}

      {modalId && (
        <AziendaModal
          aziendaId={modalId}
          onClose={() => setModalId(null)}
          onUpdate={(id, changes) =>
            setAziende(prev => prev.map(a => a.id === id ? { ...a, ...changes } as Azienda : a))
          }
        />
      )}
    </div>
  );
};
