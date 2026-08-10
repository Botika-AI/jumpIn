import React, { useState, useEffect } from 'react';
import { ArrowLeft, Award, ChevronDown, RefreshCw, CheckCircle, Plus, Minus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Tipi ─────────────────────────────────────────────────────────────────────

type Mode = 'manual' | 'automatic';

interface Evento { id: string; name: string }
interface Student { id: string; first_name: string | null; last_name: string | null; email: string; school: string | null }

interface ManualState {
  eventId: string;
  selezione: 'tutti' | 'manuale' | null;
  studentIds: string[];
}

const DEFAULT_MIN_EVENTS = 3;

interface Props {
  badge: { id: string; nome: string };
  onBack: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputClass = 'w-full appearance-none px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 pr-9';

// ── Pannello Manuale ──────────────────────────────────────────────────────────

const ManualPanel: React.FC<{
  badge: { id: string; nome: string };
  state: ManualState;
  onChange: (s: ManualState) => void;
  onSave: () => void;
  onBack: () => void;
}> = ({ badge, state, onChange, onSave, onBack }) => {
  const [eventi, setEventi]             = useState<Evento[]>([]);
  const [students, setStudents]         = useState<Student[]>([]);
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set());
  const [partCount, setPartCount]       = useState(0);
  const [search, setSearch]             = useState('');
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    supabase.from('events').select('id, name').order('event_date', { ascending: false })
      .then(({ data }) => setEventi((data ?? []) as Evento[]));
    supabase.from('profiles').select('id, first_name, last_name, email, school').order('last_name')
      .then(({ data }) => setStudents((data ?? []) as Student[]));
  }, []);

  useEffect(() => {
    if (!state.eventId) { setPartCount(0); setParticipantIds(new Set()); return; }
    supabase.from('iscrizioni_eventi').select('user_id')
      .eq('event_id', state.eventId)
      .then(({ data }) => {
        const ids = new Set((data ?? []).map((r: any) => r.user_id as string));
        setParticipantIds(ids);
        setPartCount(ids.size);
      });
  }, [state.eventId]);

  const set = (partial: Partial<ManualState>) => onChange({ ...state, ...partial });

  const toggleStudent = (id: string) =>
    set({ studentIds: state.studentIds.includes(id) ? state.studentIds.filter(s => s !== id) : [...state.studentIds, id] });

  // In selezione manuale: se c'è un evento mostra solo i partecipanti, poi applica la ricerca
  const visibleStudents = students
    .filter(s => !state.eventId || participantIds.has(s.id))
    .filter(s => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = [s.first_name, s.last_name].filter(Boolean).join(' ').toLowerCase();
      return name.includes(q) || s.email.toLowerCase().includes(q);
    });

  const badgeCount = state.selezione === 'tutti' ? partCount : state.studentIds.length;
  const canSave    = !!state.selezione && (state.selezione === 'tutti' || state.studentIds.length > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const ids = state.selezione === 'tutti'
      ? [...participantIds]
      : state.studentIds;
    await supabase.from('badge_assegnazioni').upsert(
      ids.map(uid => ({ badge_id: badge.id, user_id: uid })),
      { onConflict: 'badge_id,user_id' }
    );
    setSaving(false);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Selezione Evento */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-bold text-gray-900 mb-4">Selezione Evento</p>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Seleziona Evento <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={state.eventId} onChange={e => set({ eventId: e.target.value, selezione: null, studentIds: [] })} className={inputClass}>
                <option value="">Seleziona Evento...</option>
                {eventi.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#F3F4F6] rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-[#FDEBDD] flex items-center justify-center shrink-0">
              <Award size={15} className="text-[#E8792F]" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Badge Collegato</p>
              <p className="text-sm font-semibold text-gray-800">{badge.nome}</p>
            </div>
          </div>
        </div>

        {/* Riepilogo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          <p className="text-sm font-bold text-gray-900">Riepilogo</p>
          <div className="text-center">
            <p className="text-4xl font-bold text-[#E8792F]">{state.eventId ? partCount : '—'}</p>
            <p className="text-xs text-gray-500 mt-1">Iscritti all'Evento</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Badge da Assegnare</p>
            <p className="text-xl font-bold text-gray-900">{badgeCount > 0 ? `${badgeCount} badge` : '—'}</p>
          </div>
        </div>
      </div>

      {/* Selezione studenti */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-bold text-gray-900 mb-4">Selezione degli studenti</p>
        <div className="flex items-center gap-6 mb-4">
          {(['tutti', 'manuale'] as const).map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={state.selezione === opt}
                onChange={() => { set({ selezione: state.selezione === opt ? null : opt, studentIds: [] }); setSearch(''); }}
                className="w-4 h-4 accent-[#E8792F] rounded" />
              <span className="text-sm font-semibold text-gray-700">{opt === 'tutti' ? 'Tutti i Partecipanti' : 'Selezione Manuale'}</span>
            </label>
          ))}
        </div>
        {state.selezione === 'manuale' && (
          <>
            {/* Barra di ricerca */}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={state.eventId ? 'Cerca tra i partecipanti...' : 'Cerca studente per nome o email...'}
              className="w-full px-3.5 py-2.5 mb-3 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white"
            />
            {state.eventId && participantIds.size === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nessun iscritto per questo evento.</p>
            ) : visibleStudents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nessun risultato per "{search}".</p>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {visibleStudents.map(s => (
                  <label key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={state.studentIds.includes(s.id)} onChange={() => toggleStudent(s.id)}
                      className="w-4 h-4 accent-[#E8792F] rounded shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{[s.first_name, s.last_name].filter(Boolean).join(' ') || s.email}</p>
                      <p className="text-xs text-gray-400">{s.school ?? s.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Annulla</button>
        <button onClick={handleSave} disabled={!canSave || saving}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#E8792F] hover:bg-[#d06a25] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? 'Assegnazione in corso...' : 'Assegna Badge'}
        </button>
      </div>
    </div>
  );
};

// ── Pannello Automatico ───────────────────────────────────────────────────────

const AutomaticPanel: React.FC<{
  badge: { id: string; nome: string };
  onSave: (count: number) => void;
  onBack: () => void;
}> = ({ badge, onSave, onBack }) => {
  const [threshold, setThreshold]   = useState(DEFAULT_MIN_EVENTS);
  const [qualifiedCount, setQualifiedCount] = useState<number | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<{ id: string; name: string; assignedAt: string }[]>([]);
  const [saving, setSaving]         = useState(false);
  const [countLoading, setCountLoading] = useState(true);

  // Ricalcola idonei ogni volta che la soglia cambia
  useEffect(() => {
    setCountLoading(true);
    setQualifiedCount(null);
    (supabase.rpc as any)('count_badge_eligible_students', { p_min_events: threshold })
      .then(({ data }: { data: number | null }) => {
        setQualifiedCount(typeof data === 'number' ? data : null);
        setCountLoading(false);
      })
      .catch(() => { setQualifiedCount(null); setCountLoading(false); });
  }, [threshold]);

  // Lista studenti già assegnati a questo badge
  useEffect(() => {
    supabase.from('badge_assegnazioni')
      .select('user_id, assegnato_at, profiles!badge_assegnazioni_user_id_fkey(first_name, last_name, email)')
      .eq('badge_id', badge.id)
      .order('assegnato_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setAssignedStudents((data ?? []).map((row: any) => ({
          id: row.user_id,
          name: [row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(' ') || row.profiles?.email || '—',
          assignedAt: row.assegnato_at,
        })));
      });
  }, [badge.id]);

  const handleRemove = async (userId: string) => {
    await supabase.from('badge_assegnazioni')
      .delete()
      .eq('badge_id', badge.id)
      .eq('user_id', userId);
    setAssignedStudents(prev => prev.filter(s => s.id !== userId));
  };

  // Assegnazione: tutto avviene nel DB, il client riceve solo il conteggio
  const handleAssegna = async () => {
    setSaving(true);
    const { data, error } = await (supabase.rpc as any)(
      'assign_badge_by_event_threshold',
      { p_badge_id: badge.id, p_min_events: threshold }
    );
    setSaving(false);
    if (!error) onSave(typeof data === 'number' ? data : 0);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Regola fissa */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-bold text-gray-900 mb-4">Regola di assegnazione</p>
          <div className="flex items-start gap-3 p-4 rounded-xl border border-orange-200 bg-[#FDEBDD]/40">
            <CheckCircle size={18} className="text-[#E8792F] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">Partecipazione a {threshold} {threshold === 1 ? 'evento' : 'eventi'}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed mb-3">
                Il badge viene assegnato agli studenti che hanno effettuato il check-in QR ad almeno <span className="font-semibold">{threshold} {threshold === 1 ? 'evento già terminato' : 'eventi già terminati'}</span>.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setThreshold(t => Math.max(1, t - 1))}
                  className="w-7 h-7 rounded-lg border border-orange-200 bg-white flex items-center justify-center text-[#E8792F] hover:bg-orange-50 transition-colors"
                >
                  <Minus size={13} />
                </button>
                <span className="w-8 text-center text-sm font-bold text-gray-800">{threshold}</span>
                <button
                  type="button"
                  onClick={() => setThreshold(t => t + 1)}
                  className="w-7 h-7 rounded-lg border border-orange-200 bg-white flex items-center justify-center text-[#E8792F] hover:bg-orange-50 transition-colors"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 p-3 bg-[#F3F4F6] rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-[#FDEBDD] flex items-center justify-center shrink-0">
              <Award size={15} className="text-[#E8792F]" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Badge da assegnare</p>
              <p className="text-sm font-semibold text-gray-800">{badge.nome}</p>
            </div>
          </div>
        </div>

        {/* Riepilogo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          <p className="text-sm font-bold text-gray-900">Riepilogo</p>
          <div className="text-center flex-1 flex flex-col items-center justify-center">
            {countLoading ? (
              <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            ) : (
              <>
                <p className="text-5xl font-bold text-[#E8792F]">{qualifiedCount ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-2">studenti idonei</p>
              </>
            )}
          </div>
          {qualifiedCount !== null && qualifiedCount > 0 && (
            <p className="text-xs text-gray-400 leading-relaxed">
              Cliccando "Assegna Badge" il badge sarà assegnato a tutti {qualifiedCount} gli studenti idonei. Chi lo aveva già non viene duplicato.
            </p>
          )}
          {qualifiedCount === 0 && (
            <p className="text-xs text-orange-500 leading-relaxed">
              Nessuno studente ha ancora partecipato ad almeno {threshold} {threshold === 1 ? 'evento' : 'eventi'}.
            </p>
          )}
        </div>
      </div>

      {/* Studenti già assegnati */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">Studenti già assegnati</p>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw size={11} />
            {assignedStudents.length} assegnati
          </span>
        </div>
        {assignedStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-gray-400">Nessuno studente ha ancora ricevuto questo badge</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
            {assignedStudents.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                    {s.name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{new Date(s.assignedAt).toLocaleDateString('it-IT')}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(s.id)}
                  title="Rimuovi badge"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Annulla</button>
        <button onClick={handleAssegna}
          disabled={saving || qualifiedCount === 0 || qualifiedCount === null}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#E8792F] hover:bg-[#d06a25] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? 'Assegnazione in corso...' : 'Assegna Badge'}
        </button>
      </div>
    </div>
  );
};

// ── Pagina principale ─────────────────────────────────────────────────────────

export const AssegnazioneBadge: React.FC<Props> = ({ badge, onBack }) => {
  const [mode, setMode] = useState<Mode>('manual');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [manualState, setManualState] = useState<ManualState>({ eventId: '', selezione: null, studentIds: [] });

  const handleManualSaved = () => {
    setSuccessMsg('Badge assegnati con successo!');
    setTimeout(() => { setSuccessMsg(null); onBack(); }, 1800);
  };

  const handleAutomaticSaved = (count: number) => {
    setSuccessMsg(count > 0 ? `Badge assegnato a ${count} studenti!` : 'Nessun nuovo studente da assegnare.');
    setTimeout(() => { setSuccessMsg(null); onBack(); }, 1800);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">

      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft size={14} />
        Torna a Badge e Attestati
      </button>

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold font-montserrat text-gray-900">Assegnazione Badge</h1>
        <p className="text-sm text-gray-500 mt-1">Assegna il badge agli studenti manualmente o per obiettivo</p>
      </div>

      {/* Badge context */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-7 h-7 rounded-full bg-[#FDEBDD] flex items-center justify-center shrink-0">
          <Award size={14} className="text-[#E8792F]" />
        </div>
        <span className="text-sm font-semibold text-gray-700">{badge.nome}</span>
      </div>

      {/* Toast successo */}
      {successMsg && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-700">
          {successMsg}
        </div>
      )}

      {/* Segmented control */}
      <div className="inline-flex items-center bg-[#F3F4F6] rounded-[10px] p-1 mb-6">
        {(['manual', 'automatic'] as Mode[]).map(key => (
          <button key={key} onClick={() => setMode(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === key ? 'bg-white shadow-sm text-[#E8792F]' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {key === 'manual' ? 'Assegnazione Manuale' : 'Assegnazione per Obiettivo'}
          </button>
        ))}
      </div>

      {/* Pannello attivo */}
      {mode === 'manual' ? (
        <ManualPanel badge={badge} state={manualState} onChange={setManualState} onSave={handleManualSaved} onBack={onBack} />
      ) : (
        <AutomaticPanel badge={badge} onSave={handleAutomaticSaved} onBack={onBack} />
      )}
    </div>
  );
};
