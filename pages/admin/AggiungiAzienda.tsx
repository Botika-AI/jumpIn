import React, { useState } from 'react';
import { ArrowLeft, Upload, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resizeImage } from '../../lib/imageUtils';

interface Props {
  onBack: () => void;
  onCreated: () => void;
}

interface FormData {
  name: string;
  partita_iva: string;
  settore: string;
  website: string;
  email: string;
  email_account: string;
  telefono: string;
  indirizzo: string;
  cap: string;
  provincia: string;
  piano: 'free' | 'premium';
  stato: 'attivo' | 'disattivo';
  mostra_partner: boolean;
}

const SETTORI = [
  'IT', 'Robotica', 'Energia', 'Formazione', 'Ricerca', 'Marketing', 'Design',
  'Finanza', 'Sanità', 'Manifattura', 'Commercio', 'Edilizia', 'Altro',
];

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const AggiungiAzienda: React.FC<Props> = ({ onBack, onCreated }) => {
  const [form, setForm] = useState<FormData>({
    name: '', partita_iva: '', settore: '', website: '', email: '',
    email_account: '', telefono: '', indirizzo: '', cap: '', provincia: '',
    piano: 'free', stato: 'attivo', mostra_partner: true,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Il logo non deve superare 2MB.'); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La copertina non deve superare 5MB.'); return; }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Il nome azienda è obbligatorio.'); return; }
    setSaving(true);
    setError(null);

    let logo_url: string | null = null;
    let cover_url: string | null = null;

    const uploadImage = async (file: File, prefix: string, maxW: number, maxH: number) => {
      const resized = await resizeImage(file, maxW, maxH);
      const path = `aziende/${prefix}_${Date.now()}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from('logos')
        .upload(path, resized, { upsert: true, contentType: 'image/webp' });
      if (uploadErr) return null;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      return urlData.publicUrl;
    };

    if (logoFile || coverFile) {
      const [logoResult, coverResult] = await Promise.all([
        logoFile  ? uploadImage(logoFile,  'logo',  400, 400)   : Promise.resolve(null),
        coverFile ? uploadImage(coverFile, 'cover', 1200, 480) : Promise.resolve(null),
      ]);
      logo_url = logoResult;
      cover_url = coverResult;
    }

    const { error: insertErr } = await supabase.from('aziende').insert({
      name:           form.name.trim(),
      partita_iva:    form.partita_iva.trim() || null,
      settore:        form.settore || null,
      website:        form.website.trim() || null,
      email:          form.email.trim() || null,
      email_account:  form.email_account.trim() || null,
      telefono:       form.telefono.trim() || null,
      indirizzo:      form.indirizzo.trim() || null,
      cap:            form.cap.trim() || null,
      provincia:      form.provincia.trim() || null,
      piano:          form.piano,
      stato:          form.stato,
      mostra_partner: form.mostra_partner,
      logo_url,
      cover_url,
    });

    setSaving(false);
    if (insertErr) { setError('Errore durante il salvataggio: ' + insertErr.message); return; }
    onCreated();
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all bg-white";
  const labelClass = "block text-xs font-semibold text-gray-500 mb-1";

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={16} /> Torna alle aziende
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Aggiungi Nuova Azienda</h1>
        <p className="text-sm text-gray-500 mt-1">Inserisci i dati della nuova azienda partner</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Dati aziendali */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Dati Aziendali</h2>

          {/* Logo */}
          <div className="flex items-center gap-4">
            <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-300 transition-colors overflow-hidden shrink-0">
              {logoPreview
                ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                : <><Upload size={20} className="text-gray-300 mb-1" /><span className="text-[10px] text-gray-300">Logo</span></>
              }
              <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            </label>
            <div>
              <p className="text-sm font-medium text-gray-700">Logo azienda</p>
              <p className="text-xs text-gray-400 mt-0.5">Carica un'immagine quadrata (max 2MB)</p>
            </div>
          </div>

          {/* Copertina */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Immagine di copertina</p>
            <p className="text-xs text-gray-400 mb-2">Visibile nella pagina di dettaglio dell'azienda (max 5MB)</p>
            <label className="relative w-full h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-300 transition-colors overflow-hidden">
              {coverPreview
                ? <img src={coverPreview} alt="copertina" className="w-full h-full object-cover" />
                : <><Upload size={22} className="text-gray-300 mb-1" /><span className="text-xs text-gray-300">Carica copertina</span></>
              }
              <input type="file" accept="image/*" className="hidden" onChange={handleCover} />
            </label>
          </div>

          {/* Nome */}
          <div>
            <label className={labelClass}>Nome azienda <span className="text-orange-400">*</span></label>
            <input className={inputClass} placeholder="es. Tech Solutions SRL" value={form.name}
              onChange={e => set('name', e.target.value)} required />
          </div>

          {/* Partita IVA + Settore */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Partita IVA / Codice fiscale <span className="text-orange-400">*</span></label>
              <input className={inputClass} placeholder="IT12345678901" value={form.partita_iva}
                onChange={e => set('partita_iva', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Settore <span className="text-orange-400">*</span></label>
              <select className={inputClass} value={form.settore} onChange={e => set('settore', e.target.value)}>
                <option value="">Seleziona...</option>
                {SETTORI.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Sito web + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Sito web</label>
              <input className={inputClass} placeholder="https://www.esempio.it" value={form.website}
                onChange={e => set('website', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Email di riferimento <span className="text-orange-400">*</span></label>
              <input className={inputClass} type="email" placeholder="info@azienda.it" value={form.email}
                onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          {/* Telefono */}
          <div>
            <label className={labelClass}>Numero di telefono</label>
            <input className={inputClass} placeholder="+39 02 1234567" value={form.telefono}
              onChange={e => set('telefono', e.target.value)} />
          </div>

          {/* Indirizzo */}
          <div>
            <label className={labelClass}>Indirizzo</label>
            <input className={inputClass} placeholder="Via/Piazza" value={form.indirizzo}
              onChange={e => set('indirizzo', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input className={inputClass} placeholder="CAP" value={form.cap}
                onChange={e => set('cap', e.target.value)} />
            </div>
            <div>
              <input className={inputClass} placeholder="Provincia" value={form.provincia}
                onChange={e => set('provincia', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Account azienda */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Account Azienda</h2>
          <p className="text-xs text-gray-400 -mt-2">L'account di accesso alla piattaforma verrà attivato in un secondo momento</p>

          <div>
            <label className={labelClass}>Email account principale <span className="text-orange-400">*</span></label>
            <input className={inputClass} type="email" placeholder="admin@azienda.it" value={form.email_account}
              onChange={e => set('email_account', e.target.value)} />
            <p className="text-[11px] text-gray-400 mt-1">Questa email verrà utilizzata per l'accesso alla piattaforma</p>
          </div>

          <div>
            <label className={labelClass}>Password temporanea</label>
            <div className="flex gap-2">
              <input className={inputClass} type="text" placeholder="Genera una password sicura"
                value={password} onChange={e => setPassword(e.target.value)} readOnly />
              <button type="button"
                onClick={() => setPassword(generatePassword())}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors shrink-0 bg-white">
                <RefreshCw size={14} /> Genera
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">L'azienda dovrà cambiarla al primo accesso</p>
          </div>
        </div>

        {/* Visibilità e stato */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Visibilità e Stato</h2>

          {/* Azienda attiva */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Azienda attiva</p>
              <p className="text-xs text-gray-400 mt-0.5">L'azienda può accedere e utilizzare la piattaforma</p>
            </div>
            <button type="button" onClick={() => set('stato', form.stato === 'attivo' ? 'disattivo' : 'attivo')}
              className={`w-11 h-6 rounded-full transition-colors relative overflow-hidden shrink-0 ${form.stato === 'attivo' ? 'bg-orange-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.stato === 'attivo' ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="h-px bg-gray-50" />

          {/* Mostra partner */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Mostra nella sezione partner</p>
              <p className="text-xs text-gray-400 mt-0.5">L'azienda sarà visibile nella pagina partner della piattaforma</p>
            </div>
            <button type="button" onClick={() => set('mostra_partner', !form.mostra_partner)}
              className={`w-11 h-6 rounded-full transition-colors relative overflow-hidden shrink-0 ${form.mostra_partner ? 'bg-orange-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.mostra_partner ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Tag stato */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Tag di stato automatico:</p>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
              form.stato === 'attivo' ? 'bg-[#E6F6EC] text-[#34A853]' : 'bg-[#FDEAEA] text-[#E05252]'
            }`}>
              ✓ {form.stato === 'attivo' ? 'Attiva' : 'Disattiva'}
            </span>
          </div>
        </div>

        {/* Errore */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Azioni */}
        <div className="flex gap-3">
          <button type="button" onClick={onBack}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Annulla
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-70 shadow-md shadow-orange-200">
            {saving ? 'Salvataggio...' : 'Crea Azienda'}
          </button>
        </div>
      </form>
    </div>
  );
};
