import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resizeImage } from '../../lib/imageUtils';

interface AziendaFull {
  id: string;
  name: string;
  partita_iva: string | null;
  settore: string | null;
  website: string | null;
  email: string | null;
  email_account: string | null;
  password_temp: string | null;
  telefono: string | null;
  indirizzo: string | null;
  citta: string | null;
  cap: string | null;
  provincia: string | null;
  description: string | null;
  piano: string;
  stato: string;
  mostra_partner: boolean;
  logo_url: string | null;
  cover_url: string | null;
}

type Tab = 'account' | 'dati' | 'richieste' | 'accesso';

const TABS: { key: Tab; label: string }[] = [
  { key: 'account',   label: 'Account Azienda' },
  { key: 'dati',      label: 'Dati Aziendali'  },
  { key: 'richieste', label: 'Richieste form'  },
  { key: 'accesso',   label: 'Accesso'          },
];

type RichiestaStato = 'da_visualizzare' | 'presa_in_carico' | 'in_corso' | 'evasa';

interface Richiesta {
  id: number;
  titolo: string;
  data: string;
  stato: RichiestaStato;
}

const STATO_LABEL: Record<RichiestaStato, string> = {
  da_visualizzare: 'Da visualizzare',
  presa_in_carico: 'Presa in carico',
  in_corso:        'In corso',
  evasa:           'Evasa',
};

const STATO_STYLE: Record<RichiestaStato, string> = {
  da_visualizzare: 'bg-gray-100 text-gray-500',
  presa_in_carico: 'bg-blue-50 text-blue-600',
  in_corso:        'bg-orange-50 text-orange-500',
  evasa:           'bg-green-50 text-green-600',
};

const MOCK_RICHIESTE: Richiesta[] = [
  { id: 1, titolo: 'Richiesta partnership Hackathon', data: '20/10/2025', stato: 'da_visualizzare' },
  { id: 2, titolo: 'Richiesta stage studenti',        data: '15/11/2025', stato: 'da_visualizzare' },
  { id: 3, titolo: 'Richiesta evento networking',     data: '05/12/2025', stato: 'presa_in_carico' },
  { id: 4, titolo: 'Richiesta visita aziendale',      data: '10/01/2026', stato: 'evasa'           },
];

const Field: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
    <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 overflow-hidden whitespace-nowrap">
      {value || <span className="text-gray-300">—</span>}
    </div>
  </div>
);


const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all bg-white";

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface Props {
  aziendaId: string;
  onClose: () => void;
  onUpdate?: (id: string, changes: Record<string, unknown>) => void;
}

export const AziendaModal: React.FC<Props> = ({ aziendaId, onClose, onUpdate }) => {
  const [tab, setTab]         = useState<Tab>('account');
  const [azienda, setAzienda] = useState<AziendaFull | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Stato modifica account ──
  const [editAccount, setEditAccount]     = useState(false);
  const [editEmail, setEditEmail]         = useState('');
  const [editPassword, setEditPassword]   = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError]   = useState<string | null>(null);

  // ── Richieste form ──
  const [richieste, setRichieste]             = useState<Richiesta[]>(MOCK_RICHIESTE);
  const [editRichiestaId, setEditRichiestaId] = useState<number | null>(null);
  const [pendingStato, setPendingStato]       = useState<RichiestaStato | null>(null);

  const openStatoModal = (r: Richiesta) => { setEditRichiestaId(r.id); setPendingStato(r.stato); };
  const closeStatoModal = () => { setEditRichiestaId(null); setPendingStato(null); };
  const confirmStato = () => {
    if (editRichiestaId === null || !pendingStato) return;
    setRichieste(prev => prev.map(r => r.id === editRichiestaId ? { ...r, stato: pendingStato } : r));
    closeStatoModal();
  };

  // ── Stato modifica dati aziendali ──
  const [editDati, setEditDati]           = useState(false);
  const [datiForm, setDatiForm]           = useState({
    name: '', settore: '', email: '', telefono: '',
    indirizzo: '', citta: '', cap: '', provincia: '',
    partita_iva: '', website: '',
  });
  const [savingDati, setSavingDati]       = useState(false);
  const [datiError, setDatiError]         = useState<string | null>(null);

  // Upload immagini
  const [logoFile, setLogoFile]         = useState<File | null>(null);
  const [logoPreview, setLogoPreview]   = useState<string | null>(null);
  const [coverFile, setCoverFile]       = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const logoPreviewRef  = useRef<string | null>(null);
  const coverPreviewRef = useRef<string | null>(null);
  const logoInputRef  = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setLogoFile(f);
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      logoPreviewRef.current = url;
      setLogoPreview(url);
    };
    reader.readAsDataURL(f);
  };
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setCoverFile(f);
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      coverPreviewRef.current = url;
      setCoverPreview(url);
    };
    reader.readAsDataURL(f);
  };

  useEffect(() => {
    supabase
      .from('aziende')
      .select('*')
      .eq('id', aziendaId)
      .single()
      .then(({ data }) => { setAzienda(data as AziendaFull); setLoading(false); });
  }, [aziendaId]);

  // Account
  const startEditAccount = () => {
    if (!azienda) return;
    setEditEmail(azienda.email_account ?? '');
    setEditPassword(azienda.password_temp ?? '');
    setAccountError(null);
    setEditAccount(true);
  };
  const cancelEditAccount = () => { setEditAccount(false); setAccountError(null); };
  const saveAccount = async () => {
    if (!azienda) return;
    if (!editEmail.trim()) { setAccountError("L'email è obbligatoria."); return; }
    setSavingAccount(true);
    setAccountError(null);
    const { error } = await supabase
      .from('aziende')
      .update({ email_account: editEmail.trim(), password_temp: editPassword.trim() || null })
      .eq('id', azienda.id);
    setSavingAccount(false);
    if (error) { setAccountError('Errore nel salvataggio: ' + error.message); return; }
    setAzienda((prev: AziendaFull | null) => prev ? { ...prev, email_account: editEmail.trim(), password_temp: editPassword.trim() || null } : prev);
    setEditAccount(false);
    onUpdate?.(azienda.id, { email_account: editEmail.trim() });
  };

  // Dati aziendali
  const startEditDati = () => {
    if (!azienda) return;
    setDatiForm({
      name:        azienda.name,
      settore:     azienda.settore ?? '',
      email:       azienda.email ?? '',
      telefono:    azienda.telefono ?? '',
      indirizzo:   azienda.indirizzo ?? '',
      citta:       azienda.citta ?? '',
      cap:         azienda.cap ?? '',
      provincia:   azienda.provincia ?? '',
      partita_iva: azienda.partita_iva ?? '',
      website:     azienda.website ?? '',
    });
    setLogoFile(null);  setLogoPreview(azienda.logo_url);  logoPreviewRef.current  = azienda.logo_url;
    setCoverFile(null); setCoverPreview(azienda.cover_url); coverPreviewRef.current = azienda.cover_url;
    setDatiError(null);
    setEditDati(true);
  };
  const cancelEditDati = () => { setEditDati(false); setDatiError(null); };
  const setDati = (field: keyof typeof datiForm, value: string) =>
    setDatiForm(prev => ({ ...prev, [field]: value }));
  const uploadImage = async (file: File, prefix: string, maxW: number, maxH: number): Promise<string | null> => {
    const resized = await resizeImage(file, maxW, maxH);
    const path = `aziende/${prefix}_${Date.now()}.webp`;
    const { error } = await supabase.storage.from('logos').upload(path, resized, { upsert: true, contentType: 'image/webp' });
    if (error) return null;
    return supabase.storage.from('logos').getPublicUrl(path).data.publicUrl;
  };

  const saveDati = async () => {
    if (!azienda) return;
    if (!datiForm.name.trim()) { setDatiError('Il nome azienda è obbligatorio.'); return; }
    setSavingDati(true);
    setDatiError(null);

    const newLogoUrl  = logoFile  ? await uploadImage(logoFile,  'logo',  400,  400) : logoPreviewRef.current;
    const newCoverUrl = coverFile ? await uploadImage(coverFile, 'cover', 1200, 480) : coverPreviewRef.current;

    const update = {
      name:        datiForm.name.trim(),
      settore:     datiForm.settore || null,
      email:       datiForm.email.trim() || null,
      telefono:    datiForm.telefono.trim() || null,
      indirizzo:   datiForm.indirizzo.trim() || null,
      citta:       datiForm.citta.trim() || null,
      cap:         datiForm.cap.trim() || null,
      provincia:   datiForm.provincia.trim() || null,
      partita_iva: datiForm.partita_iva.trim() || null,
      website:     datiForm.website.trim() || null,
      logo_url:    newLogoUrl,
      cover_url:   newCoverUrl,
    };

    const { error } = await supabase
      .from('aziende')
      .update(update)
      .eq('id', azienda.id);

    setSavingDati(false);
    if (error) { setDatiError('Errore nel salvataggio: ' + error.message); return; }
    setAzienda((prev: AziendaFull | null) => prev ? { ...prev, ...update } : prev);
    setEditDati(false);
    onUpdate?.(azienda.id, { name: update.name, settore: update.settore });
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Pannello laterale destro */}
      <div className="fixed top-0 right-0 h-full z-50 w-full max-w-[580px] bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Profilo Azienda</p>
              <h2 className="font-bold font-montserrat text-gray-900 text-lg leading-tight">
                {loading ? '...' : azienda?.name}
              </h2>
            </div>
            <button onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors shrink-0 ml-4">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-gray-100">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenuto */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            </div>
          ) : !azienda ? (
            <p className="text-sm text-gray-400 text-center py-16">Azienda non trovata</p>
          ) : (
            <>
              {/* ── Account Azienda ── */}
              {tab === 'account' && (
                <div className="space-y-4">
                  {editAccount ? (
                    <>
                      {/* Modalità modifica */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Email account</p>
                        <input
                          type="email"
                          className={inputClass}
                          value={editEmail}
                          onChange={e => setEditEmail(e.target.value)}
                          placeholder="admin@azienda.it"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Password</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className={inputClass}
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            placeholder="Inserisci o genera una password"
                          />
                          <button
                            type="button"
                            onClick={() => setEditPassword(generatePassword())}
                            className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors shrink-0 bg-white"
                          >
                            <RefreshCw size={13} /> Genera
                          </button>
                        </div>
                      </div>

                      {accountError && (
                        <p className="text-xs text-red-500 px-1">{accountError}</p>
                      )}

                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={cancelEditAccount}
                          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Annulla
                        </button>
                        <button
                          onClick={saveAccount}
                          disabled={savingAccount}
                          className="flex-1 py-2.5 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-70"
                        >
                          {savingAccount ? 'Salvataggio...' : 'Salva'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Modalità visualizzazione */}
                      <Field label="Email account principale" value={azienda.email_account} />
                      <Field label="Password" value={azienda.password_temp ? '••••••••••••' : null} />
                      <button
                        onClick={startEditAccount}
                        className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors"
                      >
                        Modifica
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── Dati Aziendali ── */}
              {tab === 'dati' && (
                <div className="space-y-4">
                  {editDati ? (
                    <>
                      {/* Upload immagini */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Logo azienda</p>
                          <div
                            onClick={() => logoInputRef.current?.click()}
                            className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50"
                          >
                            {logoPreview
                              ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-2" />
                              : <div className="flex flex-col items-center gap-1 text-gray-300">
                                  <Upload size={20} /><span className="text-[10px]">Carica logo</span>
                                </div>
                            }
                          </div>
                          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                          {logoPreview && (
                            <button type="button"
                              onClick={() => { logoPreviewRef.current = null; setLogoPreview(null); setLogoFile(null); }}
                              className="mt-1 text-[11px] text-red-400 hover:text-red-600 font-medium transition-colors">
                              Rimuovi logo
                            </button>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Immagine copertina</p>
                          <div
                            onClick={() => coverInputRef.current?.click()}
                            className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50"
                          >
                            {coverPreview
                              ? <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                              : <div className="flex flex-col items-center gap-1 text-gray-300">
                                  <Upload size={20} /><span className="text-[10px]">Carica copertina</span>
                                </div>
                            }
                          </div>
                          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                          {coverPreview && (
                            <button type="button"
                              onClick={() => { coverPreviewRef.current = null; setCoverPreview(null); setCoverFile(null); }}
                              className="mt-1 text-[11px] text-red-400 hover:text-red-600 font-medium transition-colors">
                              Rimuovi copertina
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Nome azienda <span className="text-red-400">*</span></p>
                        <input className={inputClass} value={datiForm.name} onChange={e => setDati('name', e.target.value)} placeholder="Nome azienda" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Settore</p>
                        <input className={inputClass} value={datiForm.settore} onChange={e => setDati('settore', e.target.value)} placeholder="es. IT, Energia..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Email di riferimento</p>
                          <input className={inputClass} type="email" value={datiForm.email} onChange={e => setDati('email', e.target.value)} placeholder="info@azienda.it" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Telefono</p>
                          <input className={inputClass} value={datiForm.telefono} onChange={e => setDati('telefono', e.target.value)} placeholder="+39 02 1234567" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Via/Piazza</p>
                        <input className={inputClass} value={datiForm.indirizzo} onChange={e => setDati('indirizzo', e.target.value)} placeholder="Via Roma 123" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Città</p>
                          <input className={inputClass} value={datiForm.citta} onChange={e => setDati('citta', e.target.value)} placeholder="Rimini" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">CAP</p>
                          <input className={inputClass} value={datiForm.cap} onChange={e => setDati('cap', e.target.value)} placeholder="47921" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Provincia</p>
                          <input className={inputClass} value={datiForm.provincia} onChange={e => setDati('provincia', e.target.value)} placeholder="RN" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">P.IVA</p>
                        <input className={inputClass} value={datiForm.partita_iva} onChange={e => setDati('partita_iva', e.target.value)} placeholder="IT12345678901" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Sito web</p>
                        <input className={inputClass} value={datiForm.website} onChange={e => setDati('website', e.target.value)} placeholder="https://www.azienda.it" />
                      </div>

                      {datiError && <p className="text-xs text-red-500 px-1">{datiError}</p>}

                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={cancelEditDati}
                          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Annulla
                        </button>
                        <button
                          onClick={saveDati}
                          disabled={savingDati}
                          className="flex-1 py-2.5 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-70"
                        >
                          {savingDati ? 'Salvataggio...' : 'Salva'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Anteprima immagini in view mode */}
                      {(azienda.logo_url || azienda.cover_url) && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Logo</p>
                            <div className="w-full h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                              {azienda.logo_url
                                ? <img src={azienda.logo_url} alt="logo" className="w-full h-full object-cover" />
                                : <span className="text-xs text-gray-300">—</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Copertina</p>
                            <div className="w-full h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                              {azienda.cover_url
                                ? <img src={azienda.cover_url} alt="cover" className="w-full h-full object-cover" />
                                : <span className="text-xs text-gray-300">—</span>}
                            </div>
                          </div>
                        </div>
                      )}
                      <Field label="Nome azienda" value={azienda.name} />
                      <Field label="Settore"       value={azienda.settore} />
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Email di riferimento" value={azienda.email} />
                        <Field label="Telefono" value={azienda.telefono} />
                      </div>
                      <Field label="Via/Piazza" value={azienda.indirizzo} />
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Città"     value={azienda.citta} />
                        <Field label="CAP"       value={azienda.cap} />
                        <Field label="Provincia" value={azienda.provincia} />
                      </div>
                      <Field label="P.IVA"   value={azienda.partita_iva} />
                      <Field label="Sito web" value={azienda.website} />
                      <button
                        onClick={startEditDati}
                        className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors"
                      >
                        Modifica
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ── Richieste form ── */}
              {tab === 'richieste' && (
                <div className="divide-y divide-gray-50">
                  {richieste.map(r => (
                    <div key={r.id} className="py-3.5">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-semibold text-gray-800 leading-snug flex-1">{r.titolo}</p>
                        <button
                          onClick={() => openStatoModal(r)}
                          className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors shrink-0"
                        >
                          Modifica
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400">{r.data}</p>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${STATO_STYLE[r.stato]}`}>
                          {STATO_LABEL[r.stato]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Accesso ── */}
              {tab === 'accesso' && (
                <div className="space-y-6">

                  {/* Toggle stato accesso */}
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Stato accesso</p>
                      <p className="text-xs text-gray-400 mt-0.5">Attiva o disattiva l'accesso alla piattaforma</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!azienda) return;
                        const nuovoStato = azienda.stato === 'attivo' ? 'disattivo' : 'attivo';
                        const { error } = await supabase.from('aziende').update({ stato: nuovoStato }).eq('id', azienda.id);
                        if (!error) { setAzienda((prev: AziendaFull | null) => prev ? { ...prev, stato: nuovoStato } : prev); onUpdate?.(azienda.id, { stato: nuovoStato }); }
                      }}
                      className={`w-12 h-7 rounded-full transition-colors relative overflow-hidden shrink-0 ${azienda.stato === 'attivo' ? 'bg-orange-500' : 'bg-gray-200'}`}
                    >
                      <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${azienda.stato === 'attivo' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Log accessi fittizi */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-3">Ultimi accessi</p>
                    <div className="divide-y divide-gray-50">
                      {[
                        { data: '25/10/2025 11:30', esito: 'Accesso riuscito' },
                        { data: '24/10/2025 09:15', esito: 'Accesso riuscito' },
                        { data: '23/10/2025 14:45', esito: 'Accesso riuscito' },
                      ].map((log, i) => (
                        <div key={i} className="flex items-center justify-between py-3.5">
                          <p className="text-sm text-gray-600">{log.data}</p>
                          <p className="text-sm font-semibold text-green-500">{log.esito}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Sub-modal cambio stato richiesta ── */}
      {editRichiestaId !== null && (
        <>
          <div className="fixed inset-0 bg-black/30" style={{ zIndex: 60 }} onClick={closeStatoModal} />
          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 70 }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold font-montserrat text-gray-900 text-base">Aggiorna Stato Richiesta</h3>
                <button onClick={closeStatoModal} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs font-semibold text-gray-500 mb-3">Seleziona nuovo stato</p>

              <div className="space-y-2 mb-6">
                {(['da_visualizzare', 'presa_in_carico', 'in_corso', 'evasa'] as RichiestaStato[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setPendingStato(s)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-colors ${
                      pendingStato === s
                        ? 'border-orange-400 bg-orange-50 text-orange-600'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {STATO_LABEL[s]}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeStatoModal}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmStato}
                  className="flex-1 py-2.5 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors"
                >
                  Conferma
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
