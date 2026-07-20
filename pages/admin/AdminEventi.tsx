import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Calendar, Users, Upload, Plus, Search,
  ChevronDown, Download, Check, X, Bell, Link, Trash2, FileText, QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../../lib/supabase';
import { resizeImage } from '../../lib/imageUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Evento {
  id: string;               // text slug es. hackathon_coding_2025
  name: string;
  event_date: string;
  event_end: string | null;
  location: string | null;
  tipo: string | null;
  azienda_id: string | null;
  descrizione: string | null;
  logo_url: string | null;
  cover_url: string | null;
  modalita: string | null;
  scadenza_candidature: string | null;
  max_partecipanti: number | null;
  tags: string[];
  visibilita: string;
  form_esterno: string | null;
  stato: string | null;
  breve_descrizione: string | null;
  cosa_impari: string[];
  requisiti: string | null;
  created_at: string;
  iscrizioni_count?: number;
}

interface Materiale {
  id: string;
  event_id: string;
  titolo: string;
  tipo: 'link' | 'file';
  url: string;
  created_at: string;
}

type IscrizioneStato = 'in_attesa' | 'accettata' | 'rifiutata';

interface Iscrizione {
  id: string;
  event_id: string;
  user_id: string;
  stato: IscrizioneStato;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    school: string | null;
    email: string;
  } | null;
}

interface Attendance {
  id: string;
  user_id: string;
  type: 'ingresso' | 'uscita';
  scanned_at: string;
  profiles: { first_name: string | null; last_name: string | null; email: string } | null;
}

interface Azienda { id: string; name: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const TAGS_OPTIONS = ['AI', 'Design', 'STEM', 'Robotics', 'Innovation', 'Coding', 'Business'];

const VISIBILITA_OPTIONS = [
  { key: 'solo_studenti',    label: 'Solo studenti',                       desc: "Visibile solo agli studenti registrati su Jump'in" },
  { key: 'pubblico',         label: 'Pubblico',                            desc: 'Visibile a tutti'                                  },
  { key: 'studenti_sfocato', label: 'Studenti + Sfocato per non iscritti', desc: 'Visibile a tutti ma con dettagli sfocati per chi non è registrato' },
];

const ISCRIZIONE_STYLE: Record<IscrizioneStato, string> = {
  in_attesa: 'bg-orange-50 text-orange-500',
  accettata: 'bg-[#E6F6EC] text-[#34A853]',
  rifiutata: 'bg-[#FDEAEA] text-[#E05252]',
};
const ISCRIZIONE_LABEL: Record<IscrizioneStato, string> = {
  in_attesa: 'In attesa', accettata: 'Accettata', rifiutata: 'Rifiutata',
};


// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase().trim()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateRange(inizio: string, fine: string | null) {
  if (!fine || fine === inizio) return fmtDate(inizio);
  const i = new Date(inizio + 'T00:00:00');
  const f = new Date(fine   + 'T00:00:00');
  if (i.getMonth() === f.getMonth() && i.getFullYear() === f.getFullYear())
    return `${i.getDate()}-${f.getDate()} ${f.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`;
  return `${fmtDate(inizio)} – ${fmtDate(fine)}`;
}

const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-300 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all bg-white";
const labelClass = "block text-xs font-semibold text-gray-500 mb-1";

// ─── Notifica Modal ───────────────────────────────────────────────────────────

const NotificaModal: React.FC<{
  evento: { id: string; name: string };
  onClose: () => void;
}> = ({ evento, onClose }) => {
  const [titolo, setTitolo]     = useState(`Nuovo evento: ${evento.name}`);
  const [corpo, setCorpo]       = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [esistenti, setEsistenti] = useState<{ id: string; titolo: string; created_at: string }[]>([]);

  useEffect(() => {
    supabase.from('notifiche').select('id, titolo, created_at')
      .eq('riferimento_id', evento.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setEsistenti((data ?? []) as any[]));
  }, [evento.id]);

  const handleSend = async () => {
    if (!titolo.trim()) return;
    setSending(true);
    const { data } = await supabase.from('notifiche').insert({
      tipo:           'evento',
      titolo:         titolo.trim(),
      corpo:          corpo.trim() || null,
      riferimento_id: evento.id,
    }).select('id, titolo, created_at').single();
    if (data) setEsistenti(prev => [data as any, ...prev]);
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 2000);
    setTitolo('');
    setCorpo('');
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notifiche').delete().eq('id', id);
    setEsistenti(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
              <Bell size={15} className="text-orange-500" />
            </div>
            <h3 className="font-bold font-montserrat text-[#1F2430]">Invia notifica</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Verrà inviata nella campanella a tutti gli studenti registrati su Jump'in.
        </p>

        {/* Form invio */}
        <div>
          <label className={labelClass}>Titolo <span className="text-orange-400">*</span></label>
          <input className={inputClass} value={titolo}
            onChange={e => setTitolo(e.target.value)} placeholder="Titolo notifica" />
        </div>
        <div>
          <label className={labelClass}>Messaggio (opzionale)</label>
          <textarea className={`${inputClass} resize-none`} rows={3}
            value={corpo} onChange={e => setCorpo(e.target.value)}
            placeholder="Descrizione breve dell'evento..." />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Annulla
          </button>
          <button type="button" onClick={handleSend}
            disabled={sending || !titolo.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-70 shadow-md shadow-orange-200">
            {sent ? '✓ Inviata!' : sending ? 'Invio...' : 'Invia notifica'}
          </button>
        </div>

        {/* Notifiche esistenti */}
        {esistenti.length > 0 && (
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notifiche inviate</p>
            {esistenti.map(n => (
              <div key={n.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{n.titolo}</p>
                  <p className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString('it-IT')}</p>
                </div>
                <button onClick={() => handleDelete(n.id)}
                  className="shrink-0 text-gray-300 hover:text-red-400 transition-colors" title="Elimina">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── QR Modal ─────────────────────────────────────────────────────────────────

const QrModal: React.FC<{
  evento: { id: string; name: string };
  onClose: () => void;
}> = ({ evento, onClose }) => {
  const [urls, setUrls] = useState<{ ingresso: string; uscita: string } | null>(null);

  useEffect(() => {
    const opts = { width: 300, margin: 2, color: { dark: '#1F2430', light: '#FFFFFF' } };
    Promise.all([
      QRCode.toDataURL(`JUMPIN|${evento.id}|ingresso`, opts),
      QRCode.toDataURL(`JUMPIN|${evento.id}|uscita`, opts),
    ]).then(([ingresso, uscita]) => setUrls({ ingresso, uscita }));
  }, [evento.id]);

  const download = (url: string, tipo: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr_${evento.id}_${tipo}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
              <QrCode size={15} className="text-orange-500" />
            </div>
            <h3 className="font-bold font-montserrat text-[#1F2430]">QR Codes — {evento.name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-5 ml-10">Stampa e affiggi all'ingresso e all'uscita dell'evento.</p>

        {!urls ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {(['ingresso', 'uscita'] as const).map(tipo => (
              <div key={tipo} className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{tipo}</p>
                <img src={urls[tipo]} alt={`QR ${tipo}`} className="w-full rounded-xl" />
                <button
                  onClick={() => download(urls[tipo], tipo)}
                  className="w-full py-2 rounded-xl bg-[#F0813C] text-white text-xs font-bold hover:bg-orange-500 transition-colors flex items-center justify-center gap-1.5">
                  <Download size={12} /> Scarica PNG
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Schermata 1: Lista ───────────────────────────────────────────────────────

const EventiList: React.FC<{
  onCrea: () => void;
  onModifica: (id: string) => void;
  onIscrizioni: (id: string, name: string) => void;
}> = ({ onCrea, onModifica, onIscrizioni }) => {
  const [eventi, setEventi]           = useState<Evento[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterStato, setFilterStato] = useState('');
  const [notificaEvento, setNotificaEvento] = useState<{ id: string; name: string } | null>(null);
  const [qrEvento, setQrEvento]             = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    supabase
      .from('events')
      .select('*, iscrizioni_eventi(count)')
      .order('event_date', { ascending: false })
      .then(({ data }) => {
        const mapped = (data ?? []).map((e: any) => ({
          ...e,
          tags: e.tags ?? [],
          iscrizioni_count: e.iscrizioni_eventi?.[0]?.count ?? 0,
        }));
        setEventi(mapped as Evento[]);
        setLoading(false);
      });
  }, []);

  const filtered = eventi.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStato === 'pubblicato' && e.stato === 'bozza') return false;
    if (filterStato === 'bozza' && e.stato !== 'bozza') return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">I miei eventi</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci gli eventi organizzati su Jump'in</p>
        </div>
        <button onClick={onCrea}
          className="flex items-center gap-2 bg-[#F0813C] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-orange-200 hover:bg-orange-500 transition-colors shrink-0">
          <Plus size={16} /> Crea nuovo evento
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex-1 min-w-[200px]">
          <Search size={15} className="text-gray-300 shrink-0" />
          <input type="text" placeholder="Cerca..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="relative">
          <select className="appearance-none bg-white border border-gray-100 rounded-xl px-4 py-2.5 pr-8 text-sm text-gray-400 outline-none cursor-pointer"
            value={filterStato} onChange={e => setFilterStato(e.target.value)}>
            <option value="">Stato...</option>
            <option value="pubblicato">Pubblicato</option>
            <option value="bozza">Bozza</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Titolo', 'Tipo', 'Data', 'Stato', 'Candidature', 'Azioni'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-sm font-bold text-[#1F2430] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-16 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center text-sm text-gray-400">
                {eventi.length === 0
                  ? 'Nessun evento. Clicca "+ Crea nuovo evento" per iniziare.'
                  : 'Nessun risultato.'}
              </td></tr>
            ) : filtered.map((ev, i) => (
              <tr key={ev.id} className={i < filtered.length - 1 ? 'border-b border-gray-50' : ''} style={{ height: 60 }}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-[#1F2430]">{ev.name}</span>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {ev.tipo || '—'}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {fmtDateRange(ev.event_date, ev.event_end)}
                </td>
                <td className="px-6 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    ev.stato === 'bozza' ? 'bg-orange-50 text-orange-400' : 'bg-[#E6F6EC] text-[#34A853]'
                  }`}>
                    {ev.stato === 'bozza' ? 'Bozza' : 'Pubblicato'}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <button onClick={() => onIscrizioni(ev.id, ev.name)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors group">
                    <Users size={13} className="text-gray-400 group-hover:text-orange-400 shrink-0" />
                    {ev.iscrizioni_count ?? 0} candidature
                  </button>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => onModifica(ev.id)}
                      className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors">
                      Modifica
                    </button>
                    <button onClick={() => setQrEvento({ id: ev.id, name: ev.name })}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-orange-500 transition-colors"
                      title="QR Codes">
                      <QrCode size={14} />
                    </button>
                    <button onClick={() => setNotificaEvento({ id: ev.id, name: ev.name })}
                      className="flex items-center gap-1 text-sm font-semibold text-gray-400 hover:text-orange-500 transition-colors"
                      title="Invia notifica">
                      <Bell size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && eventi.length > 0 && (
        <p className="text-xs text-gray-400">
          {filtered.length} event{filtered.length === 1 ? 'o' : 'i'} trovat{filtered.length === 1 ? 'o' : 'i'}
          {eventi.length !== filtered.length && ` su ${eventi.length} totali`}
        </p>
      )}

      {notificaEvento && (
        <NotificaModal evento={notificaEvento} onClose={() => setNotificaEvento(null)} />
      )}
      {qrEvento && (
        <QrModal evento={qrEvento} onClose={() => setQrEvento(null)} />
      )}
    </div>
  );
};

// ─── Materiali Manager ────────────────────────────────────────────────────────

const MaterialiManager: React.FC<{ eventId: string }> = ({ eventId }) => {
  const [materiali, setMateriali]     = useState<Materiale[]>([]);
  const [titolo, setTitolo]           = useState('');
  const [tipo, setTipo]               = useState<'link' | 'file'>('link');
  const [url, setUrl]                 = useState('');
  const [file, setFile]               = useState<File | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [errore, setErrore]           = useState<string | null>(null);

  useEffect(() => {
    supabase.from('materiali_eventi').select('*').eq('event_id', eventId).order('created_at')
      .then(({ data }) => setMateriali((data ?? []) as Materiale[]));
  }, [eventId]);

  const handleAdd = async () => {
    if (!titolo.trim()) { setErrore('Inserisci un titolo.'); return; }
    if (tipo === 'link' && !url.trim()) { setErrore('Inserisci un URL.'); return; }
    if (tipo === 'file' && !file)       { setErrore('Seleziona un file.'); return; }
    setUploading(true); setErrore(null);

    let finalUrl = url.trim();
    if (tipo === 'file' && file) {
      const path = `materiali/${eventId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (upErr) { setErrore('Errore upload: ' + upErr.message); setUploading(false); return; }
      finalUrl = supabase.storage.from('logos').getPublicUrl(path).data.publicUrl;
    }

    const { data, error: dbErr } = await supabase.from('materiali_eventi')
      .insert({ event_id: eventId, titolo: titolo.trim(), tipo, url: finalUrl })
      .select().single();

    setUploading(false);
    if (dbErr) { setErrore('Errore: ' + dbErr.message); return; }
    setMateriali(prev => [...prev, data as Materiale]);
    setTitolo(''); setUrl(''); setFile(null);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('materiali_eventi').delete().eq('id', id);
    setMateriali(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Materiali</h2>
      <p className="text-xs text-gray-400 -mt-2">File e link visibili nella tab Materiali dell'evento</p>

      {materiali.length > 0 && (
        <ul className="space-y-2">
          {materiali.map(m => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
              {m.tipo === 'file'
                ? <FileText size={14} className="text-orange-400 shrink-0" />
                : <Link size={14} className="text-blue-400 shrink-0" />
              }
              <span className="text-sm text-gray-700 flex-1 truncate">{m.titolo}</span>
              <a href={m.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-orange-500 font-semibold hover:underline shrink-0">
                {m.tipo === 'file' ? 'Scarica' : 'Apri'}
              </a>
              <button type="button" onClick={() => handleDelete(m.id)}
                className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 pt-1">
        <div className="flex gap-2">
          <button type="button" onClick={() => setTipo('link')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${tipo === 'link' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'}`}>
            <Link size={12} /> Link
          </button>
          <button type="button" onClick={() => setTipo('file')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${tipo === 'file' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'}`}>
            <FileText size={12} /> File
          </button>
        </div>

        <input className={inputClass} placeholder="Titolo materiale"
          value={titolo} onChange={e => setTitolo(e.target.value)} />

        {tipo === 'link'
          ? <input className={inputClass} placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
          : <label className="flex items-center gap-3 px-4 py-2.5 border border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-orange-300 transition-colors">
              <Upload size={15} className="text-gray-300 shrink-0" />
              <span className="text-sm text-gray-400">{file ? file.name : 'Seleziona file...'}</span>
              <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
        }

        {errore && <p className="text-xs text-red-500">{errore}</p>}

        <button type="button" onClick={handleAdd} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors bg-white disabled:opacity-70">
          <Plus size={14} /> {uploading ? 'Caricamento...' : 'Aggiungi materiale'}
        </button>
      </div>
    </div>
  );
};

// ─── Pulsante notifica inline (usato nel form) ────────────────────────────────

const NotificaFormButton: React.FC<{ eventId: string; eventName: string }> = ({ eventId, eventName }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors bg-white">
        <Bell size={15} /> Invia notifica agli studenti
      </button>
      {open && (
        <NotificaModal evento={{ id: eventId, name: eventName }} onClose={() => setOpen(false)} />
      )}
    </>
  );
};

// ─── Schermata 2: Form crea/modifica ─────────────────────────────────────────

const EventoForm: React.FC<{
  editId: string | null;
  onBack: () => void;
  onSaved: () => void;
  onDelete?: () => void;
}> = ({ editId, onBack, onSaved, onDelete }) => {
  const isEdit = editId !== null;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingData, setLoadingData]   = useState(isEdit);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [aziende, setAziende]           = useState<Azienda[]>([]);
  const [avanzateOpen, setAvanzateOpen]     = useState(false);
  const [slugEdited, setSlugEdited]         = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [inviaNotifica, setInviaNotifica]   = useState(!isEdit);
  const [nuovaVoce, setNuovaVoce]           = useState('');

  const [form, setForm] = useState({
    id: '', name: '', tipo: '', azienda_id: '', breve_descrizione: '', descrizione: '',
    event_date: '', event_end: '', location: '', modalita: '',
    scadenza_candidature: '', max_partecipanti: '',
    tags: [] as string[], visibilita: 'solo_studenti',
    form_esterno: '', cosa_impari: [] as string[], requisiti: '',
  });
  const [coverFile, setCoverFile]       = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('aziende').select('id, name').order('name')
      .then(({ data }) => setAziende((data ?? []) as Azienda[]));

    if (!isEdit) return;
    supabase.from('events').select('*').eq('id', editId).single()
      .then(({ data }) => {
        if (!data) return;
        const e = data as Evento;
        setForm({
          id: e.id, name: e.name, tipo: e.tipo ?? '',
          azienda_id: e.azienda_id ?? '', breve_descrizione: e.breve_descrizione ?? '',
          descrizione: e.descrizione ?? '',
          event_date: e.event_date, event_end: e.event_end ?? '',
          location: e.location ?? '', modalita: e.modalita ?? '',
          scadenza_candidature: e.scadenza_candidature ?? '',
          max_partecipanti: e.max_partecipanti?.toString() ?? '',
          tags: e.tags ?? [], visibilita: e.visibilita ?? 'solo_studenti',
          form_esterno: e.form_esterno ?? '',
          cosa_impari: e.cosa_impari ?? [], requisiti: e.requisiti ?? '',
        });
        setCoverPreview(e.cover_url);
        setLoadingData(false);
      });
  }, [editId, isEdit]);

  const setField = (field: string, value: string | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      id: slugEdited ? prev.id : slugify(name),
    }));
  };

  const toggleTag = (tag: string) =>
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));

  const addCustomTag = () => {
    const val = customTagInput.trim();
    if (!val || form.tags.includes(val)) { setCustomTagInput(''); return; }
    setForm(prev => ({ ...prev, tags: [...prev.tags, val] }));
    setCustomTagInput('');
  };

  const removeTag = (tag: string) =>
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La copertina non deve superare 5MB.'); return; }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (stato: 'bozza' | 'pubblicato') => {
    if (!form.name.trim()) { setError('Il titolo è obbligatorio.'); return; }
    if (!form.id.trim())   { setError("L'ID evento non può essere vuoto."); return; }
    if (!form.event_date)  { setError('La data di inizio è obbligatoria.'); return; }
    setSaving(true); setError(null);

    let cover_url: string | null = coverPreview ?? null;

    if (coverFile) {
      const resized = await resizeImage(coverFile, 1200, 480);
      const p = `eventi/cover_${Date.now()}.webp`;
      const { error } = await supabase.storage.from('logos').upload(p, resized, { upsert: true, contentType: 'image/webp' });
      if (!error) cover_url = supabase.storage.from('logos').getPublicUrl(p).data.publicUrl;
    }

    const payload = {
      name:                 form.name.trim(),
      event_date:           form.event_date,
      event_end:            form.event_end || null,
      location:             form.location.trim() || null,
      tipo:                 form.tipo.trim() || null,
      azienda_id:           form.azienda_id || null,
      breve_descrizione:    form.breve_descrizione.trim() || null,
      descrizione:          form.descrizione.trim() || null,
      cover_url,
      modalita:             form.modalita.trim() || null,
      scadenza_candidature: form.scadenza_candidature || null,
      max_partecipanti:     form.max_partecipanti ? parseInt(form.max_partecipanti) : null,
      tags:                 form.tags,
      visibilita:           form.visibilita,
      form_esterno:         form.form_esterno.trim() || null,
      cosa_impari:          form.cosa_impari,
      requisiti:            form.requisiti.trim() || null,
      stato,
    };

    let dbErr;
    if (isEdit) {
      ({ error: dbErr } = await supabase.from('events').update(payload).eq('id', editId!));
    } else {
      ({ error: dbErr } = await supabase.from('events').insert({ id: form.id.trim(), ...payload }));
    }

    setSaving(false);
    if (dbErr) { console.error('DB error:', dbErr); setError('Errore: ' + dbErr.message); return; }

    if (inviaNotifica && stato === 'pubblicato') {
      const { error: notifErr } = await supabase.from('notifiche').insert({
        tipo:           'evento',
        titolo:         isEdit ? `Aggiornamento: ${form.name.trim()}` : `Nuovo evento: ${form.name.trim()}`,
        corpo:          form.descrizione.trim() || null,
        riferimento_id: editId ?? form.id.trim(),
      });
      if (notifErr) console.error('Notifica error:', notifErr);
      else console.log('Notifica inviata OK');
    } else {
      console.log('Notifica saltata — inviaNotifica:', inviaNotifica, 'stato:', stato);
    }

    onSaved();
  };

  if (loadingData) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={16} /> Torna agli eventi
      </button>
      <div>
        <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">
          {isEdit ? 'Modifica evento' : 'Crea nuovo evento'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Compila i dettagli dell'evento che vuoi organizzare</p>
      </div>

      <div className="space-y-5">

        {/* Informazioni di base */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Informazioni di base</h2>

          {/* Immagine copertina */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Immagine copertina</p>
            <p className="text-xs text-gray-400 mb-2">Appare come hero banner aprendo l'evento — formato 16:9 o simile (max 5MB)</p>
            <label className="relative w-full aspect-[5/2] rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-300 transition-colors overflow-hidden">
              {coverPreview
                ? <img src={coverPreview} alt="copertina" className="w-full h-full object-cover" />
                : <>
                    <Upload size={22} className="text-gray-300 mb-1" />
                    <span className="text-xs text-gray-300">Carica copertina</span>
                    <span className="text-[10px] text-gray-200 mt-0.5">1200 × 480 px consigliato</span>
                  </>
              }
              <input type="file" accept="image/*" className="hidden" onChange={handleCover} />
            </label>
            {coverPreview && (
              <button type="button"
                onClick={() => { setCoverPreview(null); setCoverFile(null); }}
                className="mt-1 text-[11px] text-red-400 hover:text-red-600 font-medium transition-colors">
                Rimuovi copertina
              </button>
            )}
          </div>

          {/* Titolo */}
          <div>
            <label className={labelClass}>Titolo evento <span className="text-orange-400">*</span></label>
            <input className={inputClass} placeholder="es. Hackathon Coding 2025"
              value={form.name} onChange={e => handleNameChange(e.target.value)} />
          </div>

          {/* ID slug — solo in creazione */}
          {!isEdit && (
            <div>
              <label className={labelClass}>ID evento (auto-generato dal titolo)</label>
              <input
                className={`${inputClass} font-mono text-xs text-gray-500 bg-gray-50`}
                value={form.id}
                onChange={e => {
                  setSlugEdited(true);
                  setField('id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                }}
                placeholder="hackathon_coding_2025"
              />
              <p className="text-[11px] text-gray-400 mt-1">Usato nei QR code — non modificabile dopo la creazione</p>
            </div>
          )}

          {/* Tipo + Azienda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tipo <span className="text-orange-400">*</span></label>
              <input className={inputClass} placeholder="es. Hackathon, Workshop..."
                value={form.tipo} onChange={e => setField('tipo', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Azienda</label>
              <select className={inputClass} value={form.azienda_id} onChange={e => setField('azienda_id', e.target.value)}>
                <option value="">Nessuna</option>
                {aziende.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Breve descrizione */}
          <div>
            <label className={labelClass}>Breve descrizione <span className="text-orange-400">*</span></label>
            <textarea className={`${inputClass} resize-none`} rows={2}
              placeholder="Una o due righe — appare nel riquadro in Esperienze"
              value={form.breve_descrizione} onChange={e => setField('breve_descrizione', e.target.value)} />
          </div>

          {/* Descrizione */}
          <div>
            <label className={labelClass}>Descrizione completa</label>
            <textarea className={`${inputClass} resize-none`} rows={4}
              placeholder="Descrivi l'evento, gli obiettivi e cosa i partecipanti possono aspettarsi..."
              value={form.descrizione} onChange={e => setField('descrizione', e.target.value)} />
          </div>

          {/* Toggle notifica */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Bell size={15} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Notifica agli studenti</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {inviaNotifica ? 'Verrà inviata una notifica in-app alla pubblicazione' : 'Nessuna notifica verrà inviata'}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setInviaNotifica(p => !p)}
              className={`w-11 h-6 rounded-full transition-colors relative overflow-hidden shrink-0 ${inviaNotifica ? 'bg-orange-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${inviaNotifica ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Data e Luogo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Data e Luogo</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data inizio <span className="text-orange-400">*</span></label>
              <input type="date" className={inputClass} value={form.event_date}
                onChange={e => setField('event_date', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Data fine</label>
              <input type="date" className={inputClass} value={form.event_end}
                onChange={e => setField('event_end', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Luogo</label>
            <input className={inputClass} placeholder="es. Via Roma 1, Rimini"
              value={form.location} onChange={e => setField('location', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Modalità</label>
            <input className={inputClass} placeholder="es. In presenza, Online, Ibrido"
              value={form.modalita} onChange={e => setField('modalita', e.target.value)} />
          </div>
        </div>

        {/* Impostazioni iscrizioni */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Impostazioni iscrizioni</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Scadenza iscrizioni</label>
              <input type="date" className={inputClass} value={form.scadenza_candidature}
                onChange={e => setField('scadenza_candidature', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Max partecipanti (opzionale)</label>
              <input type="number" className={inputClass} placeholder="es. 100"
                value={form.max_partecipanti} onChange={e => setField('max_partecipanti', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tags</label>
            {/* Tag predefiniti */}
            <div className="flex flex-wrap gap-2 mt-1 mb-2">
              {TAGS_OPTIONS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    form.tags.includes(tag)
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
                  }`}>
                  + {tag}
                </button>
              ))}
            </div>
            {/* Tag personalizzati attivi (non in TAGS_OPTIONS) */}
            {form.tags.filter(t => !TAGS_OPTIONS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.filter(t => !TAGS_OPTIONS.includes(t)).map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-500 text-white border border-orange-500">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 hover:text-orange-200 transition-colors">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Input tag personalizzato */}
            <div className="flex gap-2">
              <input
                type="text"
                className={`${inputClass} flex-1`}
                placeholder="Tag personalizzato..."
                value={customTagInput}
                onChange={e => setCustomTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
              />
              <button type="button" onClick={addCustomTag}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors bg-white shrink-0">
                + Aggiungi
              </button>
            </div>
          </div>
        </div>

        {/* Cosa ti porterai a casa */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Cosa ti porterai a casa</h2>
          <p className="text-xs text-gray-400 -mt-2">Lista dei benefici e takeaway per i partecipanti</p>

          {form.cosa_impari.length > 0 && (
            <ul className="space-y-2">
              {form.cosa_impari.map((voce, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{voce}</span>
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, cosa_impari: p.cosa_impari.filter((_, j) => j !== i) }))}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              className={`${inputClass} flex-1`}
              placeholder="es. Badge AI Innovator"
              value={nuovaVoce}
              onChange={e => setNuovaVoce(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = nuovaVoce.trim();
                  if (v) { setForm(p => ({ ...p, cosa_impari: [...p.cosa_impari, v] })); setNuovaVoce(''); }
                }
              }}
            />
            <button type="button"
              onClick={() => {
                const v = nuovaVoce.trim();
                if (v) { setForm(p => ({ ...p, cosa_impari: [...p.cosa_impari, v] })); setNuovaVoce(''); }
              }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors bg-white shrink-0">
              + Aggiungi
            </button>
          </div>
        </div>

        {/* Requisiti */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Requisiti</h2>
          <textarea className={`${inputClass} resize-none`} rows={3}
            placeholder="es. Conoscenza base di Python, laptop personale..."
            value={form.requisiti} onChange={e => setField('requisiti', e.target.value)} />
        </div>

        {/* Materiali (solo in modifica) */}
        {isEdit && <MaterialiManager eventId={editId!} />}

        {/* Visibilità */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="font-bold font-montserrat text-[#1F2430] text-base">Visibilità</h2>
          <p className="text-xs text-gray-500 -mt-1">Chi può vedere questo evento? <span className="text-orange-400">*</span></p>
          <div className="space-y-2">
            {VISIBILITA_OPTIONS.map(v => (
              <label key={v.key} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                form.visibilita === v.key ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <input type="radio" name="visibilita" value={v.key}
                  checked={form.visibilita === v.key}
                  onChange={() => setField('visibilita', v.key)}
                  className="mt-0.5 accent-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{v.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{v.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Opzioni avanzate */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button type="button" onClick={() => setAvanzateOpen(p => !p)}
            className="w-full flex items-center justify-between px-6 py-4">
            <span className="text-sm font-bold text-orange-500">Opzioni avanzate</span>
            <ChevronDown size={16} className={`text-orange-400 transition-transform ${avanzateOpen ? 'rotate-180' : ''}`} />
          </button>
          {avanzateOpen && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-50">
              <div className="pt-4">
                <label className={labelClass}>Link a form esterna (opzionale)</label>
                <input className={inputClass} placeholder="https://forms.google.com/..."
                  value={form.form_esterno} onChange={e => setField('form_esterno', e.target.value)} />
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Aggiungi quiz/survey post-evento</p>
                <p className="text-xs text-gray-400 mt-1">Potrai configurarlo dopo la creazione dell'evento</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onBack}
            className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Annulla
          </button>
          {isEdit ? (
            <button type="button" onClick={() => handleSave('pubblicato')} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-70 shadow-md shadow-orange-200">
              {saving ? 'Salvataggio...' : 'Aggiorna'}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => handleSave('bozza')} disabled={saving}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-70">
                {saving ? 'Salvataggio...' : 'Salva come bozza'}
              </button>
              <button type="button" onClick={() => handleSave('pubblicato')} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-70 shadow-md shadow-orange-200">
                {saving ? 'Salvataggio...' : 'Pubblica evento'}
              </button>
            </>
          )}
        </div>

        {/* Elimina evento — solo in modifica */}
        {isEdit && (
          <div className="pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="text-sm font-semibold text-red-400 hover:text-red-600 transition-colors">
              Elimina evento
            </button>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold font-montserrat text-[#1F2430] text-lg mb-2">Elimina evento</h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Sei sicuro di voler eliminare <strong>"{form.name}"</strong>? Verranno cancellate anche tutte le iscrizioni e i materiali associati. L'operazione è irreversibile.
            </p>
            <div className="flex gap-3">
              <button onClick={async () => {
                await supabase.from('iscrizioni_eventi').delete().eq('event_id', editId);
                await supabase.from('materiali_eventi').delete().eq('event_id', editId);
                await supabase.from('events').delete().eq('id', editId);
                onDelete?.();
                onBack();
              }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors">
                Elimina
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Schermata 3: Iscrizioni ──────────────────────────────────────────────────

const IscrizioniView: React.FC<{
  eventId: string;
  nomeEvento: string;
  onBack: () => void;
}> = ({ eventId, nomeEvento, onBack }) => {
  const today = new Date().toISOString().split('T')[0];

  const [tab, setTab]                 = useState<'candidature' | 'attivita'>('candidature');
  const [iscrizioni, setIscrizioni]   = useState<Iscrizione[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterDate, setFilterDate]   = useState(today);

  useEffect(() => {
    Promise.all([
      supabase
        .from('iscrizioni_eventi')
        .select('id, event_id, user_id, stato, created_at, profiles(first_name, last_name, school, email)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true }),
      supabase
        .from('attendances')
        .select('id, user_id, type, scanned_at, profiles(first_name, last_name, email)')
        .eq('event_id', eventId)
        .order('scanned_at', { ascending: true }),
    ]).then(([{ data: isc }, { data: att }]) => {
      setIscrizioni((isc ?? []) as unknown as Iscrizione[]);
      setAttendances((att ?? []) as unknown as Attendance[]);
      setLoading(false);
    });
  }, [eventId]);

  const inAttesa  = iscrizioni.filter(c => c.stato === 'in_attesa').length;
  const accettate = iscrizioni.filter(c => c.stato === 'accettata').length;
  const rifiutate = iscrizioni.filter(c => c.stato === 'rifiutata').length;

  const sendNotifica = async (userId: string, stato: IscrizioneStato) => {
    const accettata = stato === 'accettata';
    const { error } = await supabase.from('notifiche').insert({
      user_id: userId,
      tipo: 'evento',
      titolo: accettata ? 'Iscrizione accettata' : 'Iscrizione rifiutata',
      corpo: accettata
        ? `La tua iscrizione a "${nomeEvento}" è stata accettata. Ci vediamo lì!`
        : `La tua iscrizione a "${nomeEvento}" non è stata accettata questa volta.`,
      riferimento_id: eventId,
    });
    if (error) console.error('Notifica error:', error);
  };

  const updateStato = async (id: string, stato: IscrizioneStato) => {
    await supabase.from('iscrizioni_eventi').update({ stato }).eq('id', id);
    setIscrizioni(prev => prev.map(c => c.id === id ? { ...c, stato } : c));
    if (stato === 'accettata' || stato === 'rifiutata') {
      const iscrizione = iscrizioni.find(c => c.id === id);
      if (iscrizione) await sendNotifica(iscrizione.user_id, stato);
    }
  };

  const bulkUpdate = async (stato: IscrizioneStato) => {
    const targets = iscrizioni.filter(c => c.stato === 'in_attesa');
    if (targets.length === 0) return;
    await supabase.from('iscrizioni_eventi').update({ stato }).in('id', targets.map(c => c.id));
    setIscrizioni(prev => prev.map(c => c.stato === 'in_attesa' ? { ...c, stato } : c));
    await Promise.all(targets.map(c => sendNotifica(c.user_id, stato)));
  };

  const filteredCandidature = iscrizioni.filter(c => {
    if (!search) return true;
    const name = `${c.profiles?.first_name ?? ''} ${c.profiles?.last_name ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // ── Attività derived state ──────────────────────────────────────────────────
  const availableDates = [...new Set([
    today,
    ...attendances.map(a => new Date(a.scanned_at).toISOString().split('T')[0]),
  ])].sort().reverse();

  const attivitaRows = iscrizioni
    .filter(c => c.stato === 'accettata')
    .map(c => {
      const scans = attendances.filter(a => {
        const d = new Date(a.scanned_at).toISOString().split('T')[0];
        return a.user_id === c.user_id && d === filterDate;
      });
      const checkin  = scans.filter(a => a.type === 'ingresso').sort((a, b) => a.scanned_at.localeCompare(b.scanned_at))[0] ?? null;
      const checkout = scans.filter(a => a.type === 'uscita').sort((a, b) => a.scanned_at.localeCompare(b.scanned_at))[0] ?? null;
      const statoAtt: 'presente' | 'uscito' | null = checkin ? (checkout ? 'uscito' : 'presente') : null;
      return { iscrizione: c, checkin, checkout, statoAtt };
    });

  const attivitaFiltered = attivitaRows
    .filter(r => r.checkin !== null)
    .filter(r => {
      if (!search) return true;
      const name = `${r.iscrizione.profiles?.first_name ?? ''} ${r.iscrizione.profiles?.last_name ?? ''}`.toLowerCase();
      return name.includes(search.toLowerCase());
    });

  const presentiOggi = attivitaRows.filter(r => r.statoAtt !== null).length;

  const formatDateLabel = (d: string) => {
    const label = new Date(d + 'T00:00:00').toLocaleDateString('it-IT');
    return d === today ? `Oggi (${label})` : label;
  };

  const exportCSV = () => {
    const rows = [
      ['Nome', 'Cognome', 'Email', 'Scuola', 'Data candidatura', 'Stato'],
      ...iscrizioni.map(c => [
        c.profiles?.first_name ?? '', c.profiles?.last_name ?? '',
        c.profiles?.email ?? '', c.profiles?.school ?? '',
        new Date(c.created_at).toLocaleDateString('it-IT'), c.stato,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `candidature_${nomeEvento.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  const exportAttivitaCSV = () => {
    const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('it-IT');
    const rows = [
      ['Nome', 'Cognome', 'Email', 'Scuola', 'Data', 'Orario Check-in', 'Orario Check-out'],
      ...attivitaRows
        .filter(r => r.checkin !== null)
        .map(r => [
          r.iscrizione.profiles?.first_name ?? '',
          r.iscrizione.profiles?.last_name ?? '',
          r.iscrizione.profiles?.email ?? '',
          r.iscrizione.profiles?.school ?? '',
          r.checkin ? fmtDate(r.checkin.scanned_at) : '',
          r.checkin ? fmtTime(r.checkin.scanned_at) : '--',
          r.checkout ? fmtTime(r.checkout.scanned_at) : '--',
        ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `attivita_${nomeEvento.replace(/\s+/g, '_')}.csv`;
    a.click();
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl">

      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2">
            <ArrowLeft size={16} /> Torna agli eventi
          </button>
          <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Candidature e Attività: {nomeEvento}</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci le candidature e le attività di check-in/out dei partecipanti ricevute per questo evento</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            <Download size={15} /> Esporta candidature
          </button>
          <button onClick={exportAttivitaCSV}
            className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
            <Download size={15} /> Esporta attività
          </button>
        </div>
      </div>

      {inAttesa > 0 && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3.5">
          <p className="text-sm font-semibold text-orange-700">
            Hai {inAttesa} candidature in attesa di revisione
          </p>
          <div className="flex items-center gap-4">
            <button onClick={() => bulkUpdate('accettata')} className="text-sm font-bold text-green-600 hover:text-green-700 transition-colors">Accetta tutte</button>
            <button onClick={() => bulkUpdate('rifiutata')} className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors">Rifiuta tutte</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Totale candidature', val: iscrizioni.length, color: 'text-gray-900'  },
          { label: 'In attesa',         val: inAttesa,          color: 'text-orange-500' },
          { label: 'Accettate',         val: accettate,         color: 'text-[#34A853]'  },
          { label: 'Rifiutate',         val: rifiutate,         color: 'text-[#E05252]'  },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
            <p className={`text-3xl font-bold font-montserrat ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {([
            { key: 'candidature' as const, label: 'Tutte le Candidature' },
            { key: 'attivita'    as const, label: 'Attività (QR Check-in/Out)' },
          ]).map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); }}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
                tab === t.key
                  ? 'border-[#F0813C] text-[#F0813C]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'candidature' ? (
        <>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 max-w-sm">
            <Search size={15} className="text-gray-300 shrink-0" />
            <input type="text" placeholder="Cerca studente..."
              className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Studente', 'Scuola', 'Data iscrizione', 'Stato', 'Azioni'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-sm font-bold text-[#1F2430] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCandidature.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">Nessuna candidatura trovata.</td></tr>
                ) : filteredCandidature.map((c, i) => (
                  <tr key={c.id} className={i < filteredCandidature.length - 1 ? 'border-b border-gray-50' : ''} style={{ height: 58 }}>
                    <td className="px-6 py-3 text-sm font-medium text-[#1F2430]">
                      {c.profiles?.first_name} {c.profiles?.last_name}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{c.profiles?.school || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ISCRIZIONE_STYLE[c.stato]}`}>
                        {ISCRIZIONE_LABEL[c.stato]}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {c.stato === 'in_attesa' && (
                          <>
                            <button onClick={() => updateStato(c.id, 'accettata')}
                              className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors" title="Accetta">
                              <Check size={14} className="text-green-600" />
                            </button>
                            <button onClick={() => updateStato(c.id, 'rifiutata')}
                              className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors" title="Rifiuta">
                              <X size={14} className="text-red-500" />
                            </button>
                          </>
                        )}
                        <button className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors">
                          Vedi profilo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Toolbar attività */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 max-w-sm w-full">
              <Search size={15} className="text-gray-300 shrink-0" />
              <input type="text" placeholder="Cerca studente..."
                className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <p className="flex-1 text-center text-sm font-semibold text-gray-700 whitespace-nowrap">
              Partecipanti Presenti (Attuali):{' '}
              <span className={presentiOggi > 0 ? 'text-[#2ECC71]' : 'text-gray-500'}>{presentiOggi}</span>
              {' '}su {accettate} accettati
            </p>

            <div className="shrink-0 text-right">
              <p className="text-xs text-gray-400 font-medium mb-1">Giorno di Attività</p>
              <div className="relative">
                <select
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-8 text-sm font-medium text-gray-700 outline-none cursor-pointer focus:border-orange-300 transition-colors"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>{formatDateLabel(d)}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tabella attività */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Studente', 'Scuola', 'Stato Presenza (Oggi)', 'Check-in (Oggi)', 'Check-out (Oggi)', 'Azioni (Attività)'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-sm font-bold text-[#1F2430] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attivitaFiltered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    Nessuna scansione QR registrata per la data selezionata.
                  </td></tr>
                ) : attivitaFiltered.map((r, i) => {
                  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('it-IT');
                  return (
                    <tr key={r.iscrizione.id} className={i < attivitaFiltered.length - 1 ? 'border-b border-gray-50' : ''} style={{ height: 58 }}>
                      <td className="px-6 py-3 text-sm font-medium text-[#1F2430]">
                        {r.iscrizione.profiles?.first_name} {r.iscrizione.profiles?.last_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{r.iscrizione.profiles?.school || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          r.statoAtt === 'presente'
                            ? 'bg-[#EAF8EE] text-[#2ECC71]'
                            : 'bg-[#FEF0E1] text-[#FF8D38]'
                        }`}>
                          {r.statoAtt === 'presente' ? 'Presente' : 'Uscito'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {r.checkin ? `${fmtTime(r.checkin.scanned_at)} - ${fmtDate(r.checkin.scanned_at)}` : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {r.checkout ? `${fmtTime(r.checkout.scanned_at)} - ${fmtDate(r.checkout.scanned_at)}` : '- -'}
                      </td>
                      <td className="px-6 py-3">
                        <button className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors">
                          Vedi profilo
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
};

// ─── Export principale ────────────────────────────────────────────────────────

export const AdminEventi: React.FC = () => {
  const [view, setView]                     = useState<'list' | 'form' | 'iscrizioni'>('list');
  const [editId, setEditId]                 = useState<string | null>(null);
  const [iscrizioniInfo, setIscrizioniInfo] = useState<{ id: string; name: string } | null>(null);

  if (view === 'form') {
    return <EventoForm editId={editId} onBack={() => setView('list')} onSaved={() => setView('list')} onDelete={() => setView('list')} />;
  }
  if (view === 'iscrizioni' && iscrizioniInfo) {
    return <IscrizioniView eventId={iscrizioniInfo.id} nomeEvento={iscrizioniInfo.name} onBack={() => setView('list')} />;
  }
  return (
    <EventiList
      onCrea={() => { setEditId(null); setView('form'); }}
      onModifica={id => { setEditId(id); setView('form'); }}
      onIscrizioni={(id, name) => { setIscrizioniInfo({ id, name }); setView('iscrizioni'); }}
    />
  );
};
