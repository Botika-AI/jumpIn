import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resizeImage } from '../../lib/imageUtils';

const CAMPI_DINAMICI = [
  { key: 'nome_studente',    label: 'Nome studente',     sub: 'Inserisce automaticamente il nome dello studente nel certificato' },
  { key: 'cognome_studente', label: 'Cognome studente',  sub: 'Inserisce automaticamente il cognome dello studente nel certificato' },
  { key: 'nome_scuola',      label: 'Nome scuola',       sub: 'Inserisce automaticamente il nome della scuola dello studente' },
  { key: 'data_emissione',   label: 'Data di emissione', sub: 'Inserisce automaticamente la data in cui il certificato viene emesso' },
  { key: 'nome_evento',      label: 'Nome evento',       sub: "Inserisce automaticamente il nome dell'evento collegato" },
];

export interface AttestatoData {
  titolo: string;
  event_id: string;
  immagine_url: string | null;
  descrizione: string;
  campi_dinamici: string[];
  visibilita: 'studenti' | 'bozza';
}

export interface AttestatoInitialData extends AttestatoData {
  id: string;
}

interface JumpInEvent { id: string; name: string; }

interface Props {
  onBack: () => void;
  onSave: (data: AttestatoData) => void;
  initialData?: AttestatoInitialData;
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white transition-all';
const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';

export const CreaAttestatoForm: React.FC<Props> = ({ onBack, onSave, initialData }) => {
  const isEdit = !!initialData;
  const [titolo, setTitolo]               = useState(initialData?.titolo ?? '');
  const [eventId, setEventId]             = useState(initialData?.event_id ?? '');
  const [descrizione, setDescrizione]     = useState(initialData?.descrizione ?? '');
  const [campiDinamici, setCampiDinamici] = useState<string[]>(initialData?.campi_dinamici ?? ['nome_studente', 'cognome_studente', 'data_emissione', 'nome_evento']);
  const [immagineUrl, setImmagineUrl]     = useState<string | null>(initialData?.immagine_url ?? null);
  const [immagineFile, setImmagineFile]   = useState<File | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadError, setUploadError]     = useState(false);
  const [dragging, setDragging]           = useState(false);
  const [events, setEvents]               = useState<JumpInEvent[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('events').select('id, name').order('event_date', { ascending: false })
      .then(({ data }) => setEvents(data ?? []));
  }, []);

  const handleFile = async (f: File) => {
    setImmagineFile(f);
    setUploadError(false);
    setUploading(true);
    const preview = URL.createObjectURL(f);
    setImmagineUrl(preview);
    try {
      const isPdf = f.type === 'application/pdf';
      const path = `certificati/template_${Date.now()}${isPdf ? '.pdf' : '.webp'}`;
      let uploadFile: File;
      let contentType: string;
      if (isPdf) {
        uploadFile = f;
        contentType = 'application/pdf';
      } else {
        uploadFile = await resizeImage(f, 1200, 900);
        contentType = 'image/webp';
      }
      const { error: uploadErr } = await supabase.storage
        .from('badge-icon')
        .upload(path, uploadFile, { upsert: true, contentType });
      URL.revokeObjectURL(preview);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('badge-icon').getPublicUrl(path);
      setImmagineUrl(publicUrl);
    } catch {
      URL.revokeObjectURL(preview);
      setImmagineUrl(null);
      setImmagineFile(null);
      setUploadError(true);
    }
    setUploading(false);
  };

  const toggleCampo = (key: string) =>
    setCampiDinamici(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const handleSubmit = (asDraft = false) => {
    if (uploading) return;
    onSave({
      titolo,
      event_id: eventId,
      immagine_url: immagineUrl,
      descrizione,
      campi_dinamici: campiDinamici,
      visibilita: asDraft ? 'bozza' : 'studenti',
    });
  };

  const isPdf = immagineUrl?.includes('.pdf');

  return (
    <div className="max-w-2xl mx-auto pb-12">

      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft size={14} />
        Torna a Badge &amp; Attestati
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-montserrat text-gray-900">{isEdit ? 'Modifica Template Certificato' : 'Crea Template Certificato'}</h1>
        <p className="text-sm text-gray-500 mt-1">{isEdit ? 'Modifica i dettagli del template certificato' : 'Crea un nuovo template di certificato da assegnare agli studenti'}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* ── Informazioni ── */}
        <div className="px-8 py-7">
          <p className="text-sm font-bold text-gray-900 mb-5">Informazioni certificato</p>
          <div className="space-y-5">

            <div>
              <label className={labelClass}>Titolo certificato <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                placeholder="es. Hackathon 2025 Participation Certificate"
                value={titolo}
                onChange={e => setTitolo(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Evento collegato <span className="text-red-500">*</span></label>
              <select
                className={inputClass}
                value={eventId}
                onChange={e => setEventId(e.target.value)}
              >
                <option value="">Seleziona un evento</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Carica immagine base certificato <span className="text-red-500">*</span></label>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-9 ${
                  dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/40'
                }`}
              >
                {immagineUrl ? (
                  <>
                    {isPdf ? (
                      <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center">
                        <span className="text-sm font-bold text-orange-400">PDF</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <img src={immagineUrl} alt="preview" className={`max-w-[200px] max-h-28 object-contain rounded-lg ${uploading ? 'opacity-40' : ''}`} />
                        {uploading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 size={20} className="text-[#E8792F] animate-spin" />
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">{uploading ? 'Caricamento...' : immagineFile?.name}</p>
                    {!uploading && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setImmagineFile(null); setImmagineUrl(null); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${uploadError ? 'bg-red-100' : 'bg-gray-200'}`}>
                      <Upload size={18} className={uploadError ? 'text-red-400' : 'text-gray-400'} />
                    </div>
                    {uploadError ? (
                      <>
                        <p className="text-sm font-semibold text-red-500">Upload fallito</p>
                        <p className="text-xs text-red-400 text-center max-w-[220px] leading-relaxed">Riprova o usa un file diverso.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">Carica il template del certificato (PNG, JPG, PDF)</p>
                        <p className="text-xs text-gray-400">Il template deve includere gli spazi dove inserire i dati dinamici</p>
                        <p className="text-sm font-bold text-gray-800 mt-1">Seleziona file</p>
                      </>
                    )}
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Descrizione breve (opzionale)</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Aggiungi una descrizione per questo certificato..."
                value={descrizione}
                onChange={e => setDescrizione(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Campi dinamici ── */}
        <div className="px-8 py-7">
          <p className="text-sm font-bold text-gray-900 mb-1">Campi dinamici</p>
          <p className="text-xs text-gray-400 mb-4">Seleziona i campi che verranno inseriti automaticamente nel certificato</p>
          <div className="space-y-2">
            {CAMPI_DINAMICI.map(campo => {
              const selected = campiDinamici.includes(campo.key);
              return (
                <button
                  key={campo.key}
                  type="button"
                  onClick={() => toggleCampo(campo.key)}
                  className={`w-full text-left px-4 py-4 rounded-xl border transition-all ${
                    selected
                      ? 'border-orange-400 bg-[#FDEBDD]'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${selected ? 'text-[#E8792F]' : 'text-gray-800'}`}>{campo.label}</p>
                  <p className={`text-xs mt-0.5 ${selected ? 'text-orange-400' : 'text-gray-500'}`}>{campo.sub}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Anteprima ── */}
        <div className="px-8 py-7">
          <p className="text-sm font-bold text-gray-900 mb-4">Anteprima</p>
          <div className="bg-gray-50 rounded-xl flex items-center justify-center py-10 min-h-[110px]">
            {immagineUrl && titolo ? (
              <div className="flex flex-col items-center gap-3 w-full px-4">
                {!isPdf && <img src={immagineUrl} alt={titolo} className="max-h-40 object-contain rounded-lg shadow-sm" />}
                {isPdf && <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center"><span className="text-sm font-bold text-orange-400">PDF</span></div>}
                <p className="text-sm font-bold text-gray-800">{titolo}</p>
                {descrizione && <p className="text-xs text-gray-500 text-center max-w-xs">{descrizione}</p>}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-400">L'anteprima del certificato apparirà qui</p>
                <p className="text-xs text-gray-300 mt-1">Carica un'immagine e inserisci un titolo per visualizzare l'anteprima</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-100 px-8 py-5 flex items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
            Annulla
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={uploading}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Salva come bozza
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={!titolo || !eventId || uploading}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#E8792F] hover:bg-[#d06a25] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEdit ? 'Salva modifiche' : 'Crea template certificato'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
