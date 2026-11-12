import React, { useState, useEffect, useRef } from 'react';
import { GripVertical, Plus, Info, Trash2, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EventoForm } from './AdminEventi';

interface SectionRow { id: string; label: string; ordine: number; }
interface EventoLite { id: string; name: string; event_date: string; event_end: string | null; stato: string | null; }
interface EvidenzaRow { event_id: string; ordine: number; evento: EventoLite | null; }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Selettore evento da mettere in evidenza ──────────────────────────────────

const EventPicker: React.FC<{
  excludeIds: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}> = ({ excludeIds, onSelect, onClose }) => {
  const [eventi, setEventi]   = useState<EventoLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    supabase.from('events').select('id, name, event_date, event_end, stato')
      .eq('stato', 'pubblicato')
      .order('event_date', { ascending: true })
      .then(({ data }) => { setEventi((data ?? []) as EventoLite[]); setLoading(false); });
  }, []);

  const filtered = eventi.filter(e =>
    !excludeIds.includes(e.id) && (!search || e.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold font-montserrat text-[#1F2430]">Aggiungi evento in evidenza</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 shrink-0">
          <Search size={15} className="text-gray-300 shrink-0" />
          <input type="text" placeholder="Cerca evento..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nessun evento disponibile.</p>
          ) : filtered.map(ev => (
            <button key={ev.id} onClick={() => onSelect(ev.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-orange-300 transition-colors text-left">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{ev.name}</p>
                <p className="text-xs text-gray-400">{fmtDate(ev.event_date)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Pagina principale ─────────────────────────────────────────────────────────

export const AdminHomepage: React.FC = () => {
  const [sections, setSections]             = useState<SectionRow[]>([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const sectionDragIndex = useRef<number | null>(null);

  const [evidenza, setEvidenza]             = useState<EvidenzaRow[]>([]);
  const [loadingEvidenza, setLoadingEvidenza] = useState(true);
  const evidenzaDragIndex = useRef<number | null>(null);

  const [showPicker, setShowPicker]   = useState(false);
  const [infoEventId, setInfoEventId] = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const loadEvidenza = () => {
    setLoadingEvidenza(true);
    supabase
      .from('homepage_evidenza')
      .select('event_id, ordine, events(id, name, event_date, event_end, stato)')
      .order('ordine', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) { console.error('loadEvidenza error:', err); setError(err.message); }
        setEvidenza((data ?? []).map((r: any) => ({
          event_id: r.event_id, ordine: r.ordine, evento: r.events ?? null,
        })));
        setLoadingEvidenza(false);
      });
  };

  useEffect(() => {
    supabase.from('homepage_sections').select('*').order('ordine', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) { console.error('loadSections error:', err); setError(err.message); }
        setSections((data ?? []) as SectionRow[]);
        setLoadingSections(false);
      });
    loadEvidenza();
  }, []);

  // ── Riordino sezioni ──
  const handleSectionDrop = async (targetIndex: number) => {
    const from = sectionDragIndex.current;
    sectionDragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const reordered = [...sections];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIndex, 0, moved);
    setSections(reordered);
    await Promise.all(reordered.map((s, i) => supabase.from('homepage_sections').update({ ordine: i + 1 }).eq('id', s.id)));
  };

  const moveSection = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSections(reordered);
    await Promise.all(reordered.map((s, i) => supabase.from('homepage_sections').update({ ordine: i + 1 }).eq('id', s.id)));
  };

  // ── Riordino evidenza ──
  const handleEvidenzaDrop = async (targetIndex: number) => {
    const from = evidenzaDragIndex.current;
    evidenzaDragIndex.current = null;
    if (from === null || from === targetIndex) return;
    const reordered = [...evidenza];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIndex, 0, moved);
    setEvidenza(reordered);
    await Promise.all(reordered.map((r, i) => supabase.from('homepage_evidenza').update({ ordine: i + 1 }).eq('event_id', r.event_id)));
  };

  const moveEvidenza = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= evidenza.length) return;
    const reordered = [...evidenza];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setEvidenza(reordered);
    await Promise.all(reordered.map((r, i) => supabase.from('homepage_evidenza').update({ ordine: i + 1 }).eq('event_id', r.event_id)));
  };

  const handleRemoveEvidenza = async (eventId: string) => {
    await supabase.from('homepage_evidenza').delete().eq('event_id', eventId);
    setEvidenza(prev => prev.filter(r => r.event_id !== eventId));
  };

  const handleAddEvidenza = async (eventId: string) => {
    const ordine = evidenza.length + 1;
    const { data, error: err } = await supabase
      .from('homepage_evidenza')
      .insert({ event_id: eventId, ordine })
      .select('event_id, ordine, events(id, name, event_date, event_end, stato)')
      .single();
    if (err) { console.error('handleAddEvidenza error:', err); setError(err.message); }
    if (data) {
      const r = data as any;
      setEvidenza(prev => [...prev, { event_id: r.event_id, ordine: r.ordine, evento: r.events ?? null }]);
    }
    setShowPicker(false);
  };

  if (infoEventId) {
    return (
      <EventoForm
        editId={infoEventId}
        onBack={() => setInfoEventId(null)}
        onSaved={() => { setInfoEventId(null); loadEvidenza(); }}
        onDelete={() => { setInfoEventId(null); loadEvidenza(); }}
      />
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Gestione Homepage</h1>
        <p className="text-sm text-gray-500 mt-1">Personalizza ordine e contenuti della home degli studenti</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          Errore: {error}
        </div>
      )}

      {/* Ordine homepage */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Ordine homepage</h2>
        <p className="text-xs text-gray-400 mb-4 mt-0.5">Trascina per riordinare i contenuti in homepage</p>
        {loadingSections ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((s, i) => (
              <div
                key={s.id}
                draggable
                onDragStart={e => { sectionDragIndex.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleSectionDrop(i)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={16} className="text-gray-300 shrink-0" />
                <span className="text-sm font-medium text-gray-700 flex-1">{s.label}</span>
                <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                <div className="flex flex-col shrink-0 -my-1">
                  <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0}
                    className="w-6 h-4 flex items-center justify-center text-gray-400 hover:text-orange-500 disabled:opacity-20 disabled:hover:text-gray-400 transition-colors">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}
                    className="w-6 h-4 flex items-center justify-center text-gray-400 hover:text-orange-500 disabled:opacity-20 disabled:hover:text-gray-400 transition-colors">
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In evidenza */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-0.5">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">In evidenza</h2>
          <button onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors bg-white">
            <Plus size={13} /> Aggiungi
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Eventi mostrati nella sezione "Esperienze in evidenza" della home</p>

        {loadingEvidenza ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          </div>
        ) : evidenza.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nessun evento in evidenza. Aggiungine uno.</p>
        ) : (
          <div className="space-y-2">
            {evidenza.map((r, i) => (
              <div
                key={r.event_id}
                draggable
                onDragStart={e => { evidenzaDragIndex.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleEvidenzaDrop(i)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-100 cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={16} className="text-gray-300 shrink-0" />
                <div className="flex flex-col shrink-0 -my-1">
                  <button type="button" onClick={() => moveEvidenza(i, -1)} disabled={i === 0}
                    className="w-6 h-4 flex items-center justify-center text-gray-400 hover:text-orange-500 disabled:opacity-20 disabled:hover:text-gray-400 transition-colors">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => moveEvidenza(i, 1)} disabled={i === evidenza.length - 1}
                    className="w-6 h-4 flex items-center justify-center text-gray-400 hover:text-orange-500 disabled:opacity-20 disabled:hover:text-gray-400 transition-colors">
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.evento?.name ?? 'Evento eliminato'}</p>
                  {r.evento && <p className="text-xs text-gray-400">{fmtDate(r.evento.event_date)}</p>}
                </div>
                {r.evento && (
                  <button onClick={() => setInfoEventId(r.event_id)} title="Info"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors shrink-0">
                    <Info size={13} />
                  </button>
                )}
                <button onClick={() => handleRemoveEvidenza(r.event_id)} title="Rimuovi"
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <EventPicker
          excludeIds={evidenza.map(r => r.event_id)}
          onSelect={handleAddEvidenza}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
};
