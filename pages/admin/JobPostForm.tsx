import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Azienda { id: string; name: string; }

interface JobPostData {
  id: string;
  titolo: string;
  azienda_id: string | null;
  modalita: string;
  sede: string;
  descrizione: string;
  responsabilita: string;
  requisiti: string;
  deadline_candidature: string;
  max_candidature: string;
  form_esterno: string;
  target_studenti: string;
  visibilita: 'tutti_studenti' | 'studenti_selezionati';
  in_homepage: boolean;
  stato: string;
}

const EMPTY: Omit<JobPostData, 'id'> = {
  titolo: '', azienda_id: null, modalita: '', sede: '',
  descrizione: '', responsabilita: '', requisiti: '',
  deadline_candidature: '', max_candidature: '', form_esterno: '',
  target_studenti: '', visibilita: 'tutti_studenti', in_homepage: false,
  stato: 'bozza',
};

interface Props {
  mode: 'create' | 'edit';
  editId?: string;
  onBack: () => void;
  onSaved: () => void;
}

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-sm font-semibold text-[#1F2430] mb-1.5">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#1F2430] placeholder-gray-300 outline-none focus:border-orange-400 transition-colors";
const textareaCls = `${inputCls} resize-none min-h-[110px]`;

export const JobPostForm: React.FC<Props> = ({ mode, editId, onBack, onSaved }) => {
  const isEdit = mode === 'edit';
  const [form, setForm]         = useState<Omit<JobPostData, 'id'>>(EMPTY);
  const [aziende, setAziende]   = useState<Azienda[]>([]);
  const [loading, setLoading]   = useState(isEdit);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [dangerOpen, setDangerOpen]   = useState(false);
  const [inviaNotifica, setInviaNotifica] = useState(!isEdit);

  useEffect(() => {
    supabase.from('aziende').select('id, name').order('name')
      .then(({ data }) => setAziende((data ?? []) as Azienda[]));

    if (!isEdit || !editId) return;
    supabase.from('job_positions').select('*').eq('id', editId).single()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          titolo: data.titolo ?? '',
          azienda_id: data.azienda_id ?? null,
          modalita: data.modalita ?? '',
          sede: data.sede ?? '',
          descrizione: data.descrizione ?? '',
          responsabilita: data.responsabilita ?? '',
          requisiti: data.requisiti ?? '',
          deadline_candidature: data.deadline_candidature ?? '',
          max_candidature: data.max_candidature?.toString() ?? '',
          form_esterno: data.form_esterno ?? '',
          target_studenti: data.target_studenti ?? '',
          visibilita: data.visibilita ?? 'tutti_studenti',
          in_homepage: data.in_homepage ?? false,
          stato: data.stato ?? 'bozza',
        });
        setLoading(false);
      });
  }, [isEdit, editId]);

  const set = (field: keyof typeof EMPTY, value: string | boolean | null) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const save = async (stato: string) => {
    if (!form.titolo.trim()) { setError('Il titolo è obbligatorio.'); return; }
    setSaving(true); setError(null);
    const payload = {
      ...form,
      stato,
      max_candidature: form.max_candidature ? parseInt(form.max_candidature, 10) : null,
      deadline_candidature: form.deadline_candidature || null,
      azienda_id: form.azienda_id || null,
    };

    const { error: err } = isEdit
      ? await supabase.from('job_positions').update(payload).eq('id', editId!)
      : await supabase.from('job_positions').insert(payload);

    setSaving(false);
    if (err) { setError(err.message); return; }

    // Invia notifica broadcast a tutti gli studenti se richiesto e il job è attivo
    if (inviaNotifica && stato === 'attivo') {
      await supabase.from('notifiche').insert({
        tipo: 'sistema',
        titolo: 'Nuova offerta di lavoro disponibile',
        corpo: `È disponibile una nuova posizione: ${form.titolo}`,
      });
    }

    onSaved();
  };

  const dangerAction = async (action: 'chiudi' | 'archivia' | 'elimina') => {
    if (!editId) return;
    if (action === 'elimina') {
      if (!confirm('Sei sicuro di voler eliminare questo job post? L\'azione è irreversibile.')) return;
      await supabase.from('job_positions').delete().eq('id', editId);
      onSaved(); return;
    }
    const stato = action === 'chiudi' ? 'chiuso' : 'chiuso';
    await supabase.from('job_positions').update({ stato }).eq('id', editId);
    onSaved();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft size={16} /> Torna ai job post
        </button>
        <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">
          {isEdit ? `Modifica job post: ${form.titolo || '…'}` : 'Crea job post'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isEdit ? "Aggiorna i dettagli dell'offerta di lavoro" : "Compila i dettagli dell'offerta di lavoro"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Informazioni principali */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#1F2430] font-montserrat">Informazioni principali</h2>

        <div>
          <Label required>Titolo posizione</Label>
          <input className={inputCls} placeholder="es. Junior Frontend Developer"
            value={form.titolo} onChange={e => set('titolo', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Azienda</Label>
            <select className={inputCls} value={form.azienda_id ?? ''} onChange={e => set('azienda_id', e.target.value || null)}>
              <option value="">Seleziona azienda…</option>
              {aziende.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <Label required>Modalità di lavoro</Label>
            <select className={inputCls} value={form.modalita} onChange={e => set('modalita', e.target.value)}>
              <option value="">Seleziona…</option>
              <option value="In sede">In sede</option>
              <option value="Da remoto">Da remoto</option>
              <option value="Ibrido">Ibrido</option>
            </select>
          </div>
        </div>

        <div>
          <Label>Sede (se in sede o ibrido)</Label>
          <input className={inputCls} placeholder="es. Milano, Via Roma 123"
            value={form.sede} onChange={e => set('sede', e.target.value)} />
        </div>
      </div>

      {/* Descrizione */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#1F2430] font-montserrat">Descrizione</h2>

        <div>
          <Label required>Descrizione del ruolo</Label>
          <textarea className={textareaCls}
            placeholder="Descrivi il ruolo, le responsabilità e l'ambiente di lavoro..."
            value={form.descrizione} onChange={e => set('descrizione', e.target.value)} />
        </div>

        <div>
          <Label>Responsabilità principali</Label>
          <textarea className={textareaCls}
            placeholder="Elenca le responsabilità principali del ruolo..."
            value={form.responsabilita} onChange={e => set('responsabilita', e.target.value)} />
        </div>

        <div>
          <Label required>Requisiti minimi</Label>
          <textarea className={textareaCls}
            placeholder="Quali sono i requisiti minimi per questa posizione?"
            value={form.requisiti} onChange={e => set('requisiti', e.target.value)} />
        </div>
      </div>

      {/* Dettagli candidatura */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#1F2430] font-montserrat">Dettagli candidatura</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Deadline candidatura</Label>
            <input type="date" className={inputCls}
              value={form.deadline_candidature} onChange={e => set('deadline_candidature', e.target.value)} />
          </div>
          <div>
            <Label>Numero massimo candidature</Label>
            <input type="number" className={inputCls} placeholder="es. 50" min={1}
              value={form.max_candidature} onChange={e => set('max_candidature', e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Link a form esterno (opzionale)</Label>
          <input type="url" className={inputCls} placeholder="https://forms.google.com/..."
            value={form.form_esterno} onChange={e => set('form_esterno', e.target.value)} />
        </div>
      </div>

      {/* Target e visibilità */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#1F2430] font-montserrat">Target e visibilità</h2>

        <div>
          <Label>Target studenti</Label>
          <input className={inputCls} placeholder="es. Studenti di informatica, ultimi 2 anni"
            value={form.target_studenti} onChange={e => set('target_studenti', e.target.value)} />
        </div>

        <div>
          <Label required>Visibilità</Label>
          <div className="space-y-2">
            {([
              { key: 'tutti_studenti',      label: 'Tutti gli studenti',       desc: 'Visibile a tutti gli studenti registrati' },
              { key: 'studenti_selezionati', label: 'Solo studenti selezionati', desc: 'Potrai selezionare specifici studenti dopo la pubblicazione' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => set('visibilita', opt.key)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  form.visibilita === opt.key
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className={`text-sm font-semibold ${form.visibilita === opt.key ? 'text-orange-600' : 'text-[#1F2430]'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 accent-orange-500 shrink-0"
            checked={form.in_homepage}
            onChange={e => set('in_homepage', e.target.checked)}
          />
          <div>
            <p className="text-sm font-semibold text-[#1F2430]">Mostra job post anche in homepage</p>
            <p className="text-xs text-gray-500 mt-0.5">Il job post sarà evidenziato nella homepage della piattaforma</p>
          </div>
        </label>
      </div>

      {/* Zona pericolosa — solo edit */}
      {isEdit && (
        <div>
          <button
            type="button"
            onClick={() => setDangerOpen(d => !d)}
            className="flex items-center gap-2 text-sm text-red-500 font-semibold hover:text-red-700 transition-colors"
          >
            <AlertTriangle size={15} />
            {dangerOpen ? 'Nascondi' : 'Mostra'} zona pericolosa
          </button>

          {dangerOpen && (
            <div className="mt-3 border border-red-200 rounded-2xl p-5 bg-red-50">
              <p className="text-sm font-semibold text-red-700 mb-3">
                Le seguenti azioni sono irreversibili. Procedere con cautela.
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => dangerAction('chiudi')}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors">
                  Chiudi candidature
                </button>
                <button onClick={() => dangerAction('archivia')}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors">
                  Archivia job post
                </button>
                <button onClick={() => dangerAction('elimina')}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors">
                  Elimina job post
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle notifica */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <Bell size={15} className="text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Notifica agli studenti</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {inviaNotifica
                ? 'Verrà inviata una notifica in-app alla pubblicazione'
                : 'Nessuna notifica verrà inviata'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setInviaNotifica(p => !p)}
          className={`w-11 h-6 rounded-full transition-colors relative overflow-hidden shrink-0 ${inviaNotifica ? 'bg-orange-500' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${inviaNotifica ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button onClick={onBack}
          className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          Annulla
        </button>

        <div className="flex items-center gap-3">
          {!isEdit && (
            <button
              onClick={() => save('bozza')}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Salva come bozza
            </button>
          )}
          <button
            onClick={() => save(isEdit ? form.stato : 'attivo')}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#F0813C] text-white shadow-md shadow-orange-200 hover:bg-orange-500 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvataggio…' : isEdit ? 'Aggiorna job post' : 'Pubblica job post'}
          </button>
        </div>
      </div>
    </div>
  );
};
