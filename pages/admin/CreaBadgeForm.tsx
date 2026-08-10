import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, X, UserCheck, CalendarCheck, Trophy, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resizeImage } from '../../lib/imageUtils';

type Visibilita = 'studenti' | 'interno' | 'bozza';

const ALL_TAGS = ['Leadership', 'Innovation', 'Teamwork', 'Technical', 'Design', 'Communication'];

const VISIBILITA_OPTIONS: { key: Visibilita; label: string; sub: string }[] = [
  { key: 'studenti', label: 'Visibile agli studenti',        sub: 'Il badge sarà visibile nel profilo dello studente' },
  { key: 'interno',  label: 'Visibile solo internamente',    sub: 'Visibile solo agli amministratori e insegnanti' },
  { key: 'bozza',    label: 'Nascosto (bozza)',              sub: 'Il badge non sarà visibile a nessuno' },
];


export interface BadgeData {
  nome: string;
  descrizione: string;
  categoria: string;
  visibilita: Visibilita;
  tags: string[];
  iconaUrl: string | null;
}

export interface BadgeInitialData extends BadgeData {
  id: string;
}

interface Props {
  onBack: () => void;
  onSave: (data: BadgeData) => void;
  initialData?: BadgeInitialData;
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white transition-all';
const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';


export const CreaBadgeForm: React.FC<Props> = ({ onBack, onSave, initialData }) => {
  const isEdit = !!initialData;

  const [nome, setNome]               = useState(initialData?.nome ?? '');
  const [descrizione, setDescrizione] = useState(initialData?.descrizione ?? '');
  const [categoria, setCategoria]     = useState(initialData?.categoria ?? '');
  const [visibilita, setVisibilita]   = useState<Visibilita>((initialData?.visibilita as Visibilita) ?? 'studenti');
  const [tags, setTags]               = useState<string[]>(initialData?.tags ?? []);
  const [iconaFile, setIconaFile]     = useState<File | null>(null);
  const [iconaUrl, setIconaUrl]       = useState<string | null>(
    // ignora blob: URL salvati in sessioni precedenti — non sono persistenti
    initialData?.iconaUrl?.startsWith('blob:') ? null : (initialData?.iconaUrl ?? null)
  );
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [dragging, setDragging]       = useState(false);
  const fileRef                       = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setIconaFile(f);
    setUploadError(false);
    setUploading(true);
    const preview = URL.createObjectURL(f);
    setIconaUrl(preview);
    try {
      const resized = await resizeImage(f, 256, 256);
      const path = `badges/icon_${Date.now()}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from('badge-icon')
        .upload(path, resized, { upsert: true, contentType: 'image/webp' });
      URL.revokeObjectURL(preview);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('badge-icon').getPublicUrl(path);
      console.log('[badge-icon publicUrl]', publicUrl);
      setIconaUrl(publicUrl);
    } catch {
      URL.revokeObjectURL(preview);
      setIconaUrl(null);
      setIconaFile(null);
      setUploadError(true);
    }
    setUploading(false);
  };

  const toggleTag = (tag: string) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSubmit = (asDraft = false) => {
    if (uploading) return;
    onSave({ nome, descrizione, categoria, visibilita: asDraft ? 'bozza' : visibilita, tags, iconaUrl });
  };

  return (
    <div className="max-w-2xl mx-auto pb-12">

      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        Torna a Badges &amp; Attestati
      </button>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-montserrat text-gray-900">{isEdit ? 'Modifica Badge' : 'Crea Badge'}</h1>
        <p className="text-sm text-gray-500 mt-1">{isEdit ? 'Modifica i dettagli del badge' : 'Crea un nuovo badge da assegnare agli studenti'}</p>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* ── Sezione 1: Informazioni ── */}
        <div className="px-8 py-7">
          <p className="text-sm font-bold text-gray-900 mb-5">Informazioni badge</p>

          <div className="space-y-5">

            {/* Nome */}
            <div>
              <label className={labelClass}>
                Nome badge <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="es. Digital Innovator"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>

            {/* Descrizione */}
            <div>
              <label className={labelClass}>
                Descrizione breve <span className="text-red-500">*</span>
              </label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Descrivi quando questo badge viene assegnato..."
                value={descrizione}
                onChange={e => setDescrizione(e.target.value)}
              />
            </div>

            {/* Dropzone icona */}
            <div>
              <label className={labelClass}>
                Icona/immagine badge <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault(); setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-9 ${
                  dragging ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/40'
                }`}
              >
                {iconaUrl ? (
                  <>
                    <div className="relative">
                      <img src={iconaUrl} alt="preview icona" className={`w-16 h-16 object-contain rounded-xl ${uploading ? 'opacity-40' : ''}`} />
                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 size={20} className="text-[#E8792F] animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{uploading ? 'Caricamento...' : iconaFile?.name}</p>
                    {!uploading && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setIconaFile(null); setIconaUrl(null); }}
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
                        <p className="text-xs text-red-400 text-center max-w-[220px] leading-relaxed">
                          Riprova o usa un file PNG/JPG diverso.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">Carica l'immagine del badge (PNG, JPG, SVG)</p>
                        <p className="text-xs text-gray-400">Dimensioni consigliate: 512x512px</p>
                        <p className="text-sm font-bold text-gray-800 mt-1">Seleziona file</p>
                      </>
                    )}
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className={labelClass}>Categoria (opzionale)</label>
              <input
                type="text"
                className={inputClass}
                placeholder="es. Leadership, Tecnico..."
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Sezione 2: Assegnazione e visibilità ── */}
        <div className="px-8 py-7">
          <p className="text-sm font-bold text-gray-900 mb-5">Assegnazione e visibilità</p>

          <div className="space-y-5">

            {/* Visibilità */}
            <div>
              <label className={labelClass}>
                Visibilità <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {VISIBILITA_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setVisibilita(opt.key)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      visibilita === opt.key
                        ? 'border-orange-400 bg-[#FDEBDD]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tag */}
            <div>
              <label className={labelClass}>Tag (opzionali)</label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      tags.includes(tag)
                        ? 'bg-[#FDEBDD] text-[#E8792F] border-orange-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tags.includes(tag) ? tag : `+ ${tag}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Modalità di assegnazione — informativo */}
            <div>
              <label className={labelClass}>Modalità di assegnazione</label>
              <p className="text-xs text-gray-400 mb-3">Una volta creato il badge potrai assegnarlo nelle seguenti modalità:</p>
              <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-100">
                {[
                  { Icon: UserCheck,    label: 'Assegnazione manuale',                                      sub: 'Gli amministratori potranno assegnare questo badge direttamente agli studenti dalla sezione Utenti.', esempi: null },
                  { Icon: CalendarCheck, label: 'Assegnazione al completamento di un evento',               sub: 'Il badge può essere assegnato automaticamente quando uno studente partecipa e completa un evento specifico.', esempi: null },
                  { Icon: Trophy,       label: 'Assegnazione al raggiungimento di un risultato',            sub: 'Il badge viene assegnato automaticamente quando lo studente raggiunge un obiettivo o traguardo definito.', esempi: ['Partecipato a più di 3 hackathon', 'Ottenuto 5 connessioni con aziende partner'] },
                ].map(({ Icon, label, sub, esempi }) => (
                  <div key={label} className="px-4 py-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FDEBDD] flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={15} className="text-[#E8792F]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{sub}</p>
                      {esempi && (
                        <ul className="mt-2 space-y-0.5">
                          {esempi.map(e => (
                            <li key={e} className="text-xs text-gray-500 flex items-start gap-1.5">
                              <span className="text-[#E8792F] mt-0.5 shrink-0">·</span>{e}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Sezione 3: Anteprima ── */}
        <div className="px-8 py-7">
          <p className="text-sm font-bold text-gray-900 mb-4">Anteprima</p>
          <div className="bg-gray-50 rounded-xl flex items-center justify-center py-10 min-h-[110px]">
            {iconaUrl && nome ? (
              <div className="flex flex-col items-center gap-3">
                <img src={iconaUrl} alt={nome} className="w-16 h-16 object-contain rounded-2xl shadow-sm" />
                <p className="text-sm font-bold text-gray-800">{nome}</p>
                {descrizione && <p className="text-xs text-gray-500 text-center max-w-xs">{descrizione}</p>}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-400">L'anteprima del badge apparirà qui</p>
                <p className="text-xs text-gray-300 mt-1">Carica un'immagine e inserisci un nome per visualizzare l'anteprima</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-100 px-8 py-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
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
              disabled={!nome || !descrizione || uploading}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#E8792F] hover:bg-[#d06a25] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEdit ? 'Salva modifiche' : 'Crea badge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
