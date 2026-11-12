import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StudenteFull {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  school: string | null;
  dob: string | null;
  bio: string | null;
  interests: string[] | null;
}

type Tab = 'dati' | 'esperienze' | 'accessi' | 'feedback';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dati',       label: 'Dati utente' },
  { key: 'esperienze', label: 'Esperienze completate' },
  { key: 'accessi',    label: 'Registro accessi' },
  { key: 'feedback',   label: 'Feedback ricevuti' },
];

const Field: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
    <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 overflow-hidden whitespace-nowrap">
      {value || <span className="text-gray-300">—</span>}
    </div>
  </div>
);

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all bg-white';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Tab Dati utente ─────────────────────────────────────────────────────────

const DatiUtenteTab: React.FC<{
  student: StudenteFull;
  onUpdate: (changes: Partial<StudenteFull>) => void;
  onDelete: () => void;
}> = ({ student, onUpdate, onDelete }) => {
  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draftFirstName, setDraftFirstName] = useState(student.first_name ?? '');
  const [draftLastName,  setDraftLastName]  = useState(student.last_name ?? '');
  const [draftSchool,    setDraftSchool]    = useState(student.school ?? '');
  const [draftDob,       setDraftDob]       = useState(student.dob ?? '');
  const [draftBio,       setDraftBio]       = useState(student.bio ?? '');
  const [draftInterests, setDraftInterests] = useState<string[]>(student.interests ?? []);
  const [interestInput,  setInterestInput]  = useState('');

  const openEdit = () => {
    setDraftFirstName(student.first_name ?? '');
    setDraftLastName(student.last_name ?? '');
    setDraftSchool(student.school ?? '');
    setDraftDob(student.dob ?? '');
    setDraftBio(student.bio ?? '');
    setDraftInterests(student.interests ?? []);
    setInterestInput('');
    setEditing(true);
  };

  const addInterest = () => {
    const val = interestInput.trim();
    if (!val || draftInterests.includes(val)) return;
    setDraftInterests(prev => [...prev, val]);
    setInterestInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    const changes = {
      first_name: draftFirstName.trim(),
      last_name:  draftLastName.trim(),
      school:     draftSchool.trim(),
      dob:        draftDob || null,
      bio:        draftBio.trim(),
      interests:  draftInterests,
    };
    const { error } = await supabase.from('profiles').update(changes).eq('id', student.id);
    setSaving(false);
    if (!error) {
      onUpdate(changes);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.rpc('admin_delete_student', { p_user_id: student.id });
    setDeleting(false);
    if (!error) onDelete();
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Nome</p>
            <input value={draftFirstName} onChange={e => setDraftFirstName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Cognome</p>
            <input value={draftLastName} onChange={e => setDraftLastName(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Data di nascita</p>
          <input type="date" value={draftDob} onChange={e => setDraftDob(e.target.value)} className={inputClass} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Scuola</p>
          <input value={draftSchool} onChange={e => setDraftSchool(e.target.value)} className={inputClass} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Bio</p>
          <textarea
            value={draftBio} onChange={e => setDraftBio(e.target.value)}
            rows={3} className={`${inputClass} resize-none`}
          />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">Interessi</p>
          {draftInterests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draftInterests.map((tag, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-500">
                  {tag}
                  <button onClick={() => setDraftInterests(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 text-orange-400 hover:text-orange-600">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={interestInput} onChange={e => setInterestInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInterest()}
              placeholder="Aggiungi interesse" className={inputClass}
            />
            <button onClick={addInterest} disabled={!interestInput.trim()}
              className="shrink-0 px-3 rounded-xl bg-orange-50 text-orange-500 disabled:opacity-40 transition-opacity">
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-50">
            {saving ? 'Salvo...' : 'Salva'}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Annulla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Nome completo" value={`${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data di nascita" value={student.dob ? fmtDate(student.dob) : null} />
        <Field label="Scuola" value={student.school} />
      </div>
      <Field label="Email" value={student.email} />
      <Field label="Bio" value={student.bio} />
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1">Interessi</p>
        {student.interests && student.interests.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {student.interests.map((tag, i) => (
              <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-500">
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-300">—</div>
        )}
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <button onClick={openEdit} className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors">
          Modifica
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Sicuro? Azione irreversibile.</span>
            <button onClick={handleDelete} disabled={deleting}
              className="text-sm font-bold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50">
              {deleting ? 'Elimino...' : 'Conferma'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
              Annulla
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
            Elimina
          </button>
        )}
      </div>
    </div>
  );
};

// ── Tab Esperienze completate ─────────────────────────────────────────────

interface EsperienzaCompletata {
  eventId: string;
  name: string;
  completedAt: string;
}

const EsperienzeTab: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [items, setItems] = useState<EsperienzaCompletata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: iscr }, { data: att }] = await Promise.all([
        supabase.from('iscrizioni_eventi')
          .select('event_id, events(name)')
          .eq('user_id', studentId)
          .eq('stato', 'accettata'),
        supabase.from('attendances')
          .select('event_id, scanned_at')
          .eq('user_id', studentId)
          .order('scanned_at', { ascending: false }),
      ]);

      const lastAccessByEvent = new Map<string, string>();
      for (const a of att ?? []) {
        if (!lastAccessByEvent.has(a.event_id)) lastAccessByEvent.set(a.event_id, a.scanned_at);
      }

      const completate: EsperienzaCompletata[] = [];
      for (const r of iscr ?? []) {
        const scanned = lastAccessByEvent.get(r.event_id);
        if (!scanned) continue;
        completate.push({
          eventId: r.event_id,
          name: (r as any).events?.name ?? 'Evento',
          completedAt: scanned,
        });
      }
      completate.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      setItems(completate);
      setLoading(false);
    };
    load();
  }, [studentId]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
    </div>
  );

  if (items.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-12">Nessuna esperienza completata</p>
  );

  return (
    <div className="space-y-4">
      {items.map(it => (
        <div key={it.eventId} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
          <p className="text-sm font-bold text-gray-900">{it.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Completato il {fmtDate(it.completedAt)}</p>
        </div>
      ))}
    </div>
  );
};

// ── Tab Registro accessi ────────────────────────────────────────────────────

const AccessiTab: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [logs, setLogs] = useState<{ id: string; accessed_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('access_logs')
      .select('id, accessed_at')
      .eq('user_id', studentId)
      .order('accessed_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { setLogs(data ?? []); setLoading(false); });
  }, [studentId]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
    </div>
  );

  if (logs.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-12">Nessun accesso registrato</p>
  );

  return (
    <div className="space-y-3">
      {logs.map(l => (
        <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <span className="text-sm text-gray-600">{fmtDateTime(l.accessed_at)}</span>
          <span className="text-sm font-semibold text-green-600">Accesso riuscito</span>
        </div>
      ))}
    </div>
  );
};

// ── Tab Feedback ricevuti ────────────────────────────────────────────────────

interface FeedbackRow {
  id: string;
  eventName: string;
  rating: number;
  positivo: string | null;
}

const FeedbackTab: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('feedback_eventi')
      .select('id, rating, positivo, events(name)')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []).map((r: any) => ({
          id: r.id,
          eventName: r.events?.name ?? 'Evento',
          rating: r.rating,
          positivo: r.positivo,
        })));
        setLoading(false);
      });
  }, [studentId]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
    </div>
  );

  if (items.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-12">Nessun feedback ricevuto</p>
  );

  return (
    <div className="space-y-4">
      {items.map(f => (
        <div key={f.id} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
          <p className="text-sm font-bold text-gray-900 mb-1">{f.eventName}</p>
          {f.positivo && <p className="text-sm text-gray-600 italic mb-1.5">"{f.positivo}"</p>}
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < f.rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────

interface Props {
  studentId: string;
  onClose: () => void;
  onUpdate?: (id: string, changes: Record<string, unknown>) => void;
  onDelete?: (id: string) => void;
}

export const StudenteModal: React.FC<Props> = ({ studentId, onClose, onUpdate, onDelete }) => {
  const [tab, setTab] = useState<Tab>('dati');
  const [student, setStudent] = useState<StudenteFull | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStudent = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, school, dob, bio, interests')
      .eq('id', studentId)
      .single();
    setStudent(data as StudenteFull | null);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchStudent(); }, [fetchStudent]);

  const handleFieldUpdate = (changes: Partial<StudenteFull>) => {
    setStudent(prev => prev ? { ...prev, ...changes } : prev);
    onUpdate?.(studentId, changes);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 w-full max-w-[580px] bg-white shadow-2xl flex flex-col">
        <div className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Profilo Studente</p>
              <h2 className="font-bold font-montserrat text-gray-900 text-lg leading-tight">
                {loading ? '...' : `${student?.first_name ?? ''} ${student?.last_name ?? ''}`.trim()}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors shrink-0 ml-4">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-0 border-b border-gray-100 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            </div>
          ) : !student ? (
            <p className="text-sm text-gray-400 text-center py-16">Studente non trovato</p>
          ) : (
            <>
              {tab === 'dati'       && <DatiUtenteTab student={student} onUpdate={handleFieldUpdate} onDelete={() => onDelete?.(studentId)} />}
              {tab === 'esperienze' && <EsperienzeTab studentId={studentId} />}
              {tab === 'accessi'    && <AccessiTab studentId={studentId} />}
              {tab === 'feedback'   && <FeedbackTab studentId={studentId} />}
            </>
          )}
        </div>
      </div>
    </>
  );
};
