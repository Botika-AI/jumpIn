import React, { useState, useEffect } from 'react';
import {
  CalendarDays, MapPin, Users, ChevronLeft, CheckCircle2,
  QrCode, MessageSquare, BookOpen, X, Compass, LogIn, LogOut, Search,
  ScrollText, Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import QrScanner from './QRScanner';
import { generateCertificatePDF } from '../lib/certificateGenerator';

// ── Tipi ──────────────────────────────────────────────────────────────────────

interface EventoIscritto {
  id: string;
  name: string;
  event_date: string;
  event_end: string | null;
  location: string | null;
  cover_url: string | null;
  tipo: string | null;
  max_partecipanti: number | null;
  statoIscrizione: 'in_attesa' | 'accettata';
}

interface FullEvento extends EventoIscritto {
  descrizione: string | null;
  breve_descrizione: string | null;
  cosa_impari: string[];
  requisiti: string | null;
}

interface AttendanceRow {
  id: string;
  type: string;
  scanned_at: string;
}

interface CertificatoTemplate {
  id: string;
  titolo: string;
  descrizione: string;
  immagine_url: string | null;
  campi_dinamici: string[];
}

type View = 'list' | 'detail' | 'feedback' | 'success';

// ── Helper ────────────────────────────────────────────────────────────────────

const GRADIENTS = [
  'from-orange-400 to-orange-600', 'from-violet-500 to-purple-600',
  'from-blue-400 to-blue-600',     'from-emerald-400 to-teal-600',
  'from-pink-400 to-rose-600',     'from-amber-400 to-orange-500',
];

function gradientForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[h];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateRange(start: string, end: string | null) {
  if (!end || end === start) return fmtDate(start);
  const s = new Date(start); const e = new Date(end);
  const mon = e.toLocaleDateString('it-IT', { month: 'short' });
  const yr  = e.getFullYear();
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear())
    return `${s.getDate()}-${e.getDate()} ${mon} ${yr}`;
  return `${s.getDate()} ${s.toLocaleDateString('it-IT', { month: 'short' })} – ${e.getDate()} ${mon} ${yr}`;
}

function eventoStatus(ev: EventoIscritto): 'futuro' | 'in_corso' | 'concluso' {
  const today = new Date();
  const start = new Date(ev.event_date);
  const end   = ev.event_end ? new Date(ev.event_end) : new Date(ev.event_date);
  end.setHours(23, 59, 59, 999);
  if (today < start) return 'futuro';
  if (today > end)   return 'concluso';
  return 'in_corso';
}

async function processQrScan(text: string, userId: string): Promise<{ ok: boolean; msg: string }> {
  const parts = text.split('|');
  if (parts[0] !== 'JUMPIN' || parts.length !== 3)
    return { ok: false, msg: 'QR code non valido' };

  const [, eventId, tipo] = parts;
  const { data: ev } = await supabase.from('events').select('id, event_date, event_end').eq('id', eventId).single();
  if (!ev) return { ok: false, msg: 'Evento non trovato' };

  const today = new Date();
  const start = new Date(ev.event_date);
  const end   = ev.event_end ? new Date(ev.event_end) : new Date(ev.event_date);
  end.setHours(23, 59, 59, 999);
  if (today < start) return { ok: false, msg: 'Evento non ancora iniziato' };
  if (today > end)   return { ok: false, msg: 'Evento terminato' };

  await supabase.from('attendances').insert({ user_id: userId, event_id: eventId, type: tipo });
  await supabase.from('profiles').update({ last_checkin: new Date().toISOString() }).eq('id', userId);

  return { ok: true, msg: tipo === 'ingresso' ? 'Check-in registrato!' : 'Check-out registrato!' };
}

// ── EventCard ─────────────────────────────────────────────────────────────────

const EventCard: React.FC<{
  ev: EventoIscritto;
  onDetail: () => void;
  onScan: () => void;
  onFeedback: () => void;
}> = ({ ev, onDetail, onScan, onFeedback }) => {
  const status       = eventoStatus(ev);
  const isConcluso   = status === 'concluso';
  const isConfermato = ev.statoIscrizione === 'accettata';

  const statoLabel = ev.statoIscrizione === 'accettata'
    ? (isConcluso ? 'Completato' : 'Confermata')
    : 'In attesa';
  const statoStyle = ev.statoIscrizione === 'accettata'
    ? (isConcluso ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-600')
    : 'bg-orange-50 text-orange-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 pt-4 pb-4">
      {/* Titolo + badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold font-montserrat text-gray-900 text-base leading-snug flex-1">
          {ev.name}
        </h3>
        <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${statoStyle}`}>
          {statoLabel}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 font-medium mb-4">
        <span className="flex items-center gap-1"><CalendarDays size={11} />{fmtDateRange(ev.event_date, ev.event_end)}</span>
        {ev.location && <span className="flex items-center gap-1"><MapPin size={11} />{ev.location}</span>}
      </div>

      {/* Bottoni */}
      <div className="flex gap-2">
        {isConfermato && !isConcluso && (
          <button onClick={onScan} className="py-2 px-4 rounded-xl btn-primary-liquid text-xs font-bold flex items-center gap-1.5">
            <QrCode size={13} /> Inquadra QR Code
          </button>
        )}
        {isConfermato && isConcluso && (
          <button onClick={onFeedback} className="py-2 px-4 rounded-xl btn-primary-liquid text-xs font-bold flex items-center gap-1.5">
            <MessageSquare size={13} /> Lascia feedback
          </button>
        )}
        <button onClick={onDetail} className="py-2 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:border-gray-300 transition-colors">
          Dettagli
        </button>
      </div>
    </div>
  );
};

// ── Registro Attività ─────────────────────────────────────────────────────────

const RegistroAttivita: React.FC<{ eventId: string; userId: string }> = ({ eventId, userId }) => {
  const [rows, setRows]       = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('attendances').select('id, type, scanned_at')
      .eq('event_id', eventId).eq('user_id', userId)
      .order('scanned_at', { ascending: true })
      .then(({ data }) => { setRows((data ?? []) as AttendanceRow[]); setLoading(false); });
  }, [eventId, userId]);

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
    </div>
  );

  if (rows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
        <CalendarDays size={24} className="text-gray-400" />
      </div>
      <p className="font-bold font-montserrat text-gray-700">Nessuna attività registrata</p>
      <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
        Le scansioni QR appariranno qui una volta effettuate.
      </p>
    </div>
  );

  return (
    <div>
      <h3 className="font-bold font-montserrat text-gray-900 mb-3">Le mie attività</h3>
      <div className="rounded-2xl overflow-hidden border border-gray-100">
        <div className="grid grid-cols-3 px-4 py-2.5 bg-gray-50 text-xs font-bold text-gray-500 border-b border-gray-100">
          <span>Evento</span><span>Data</span><span>Ora</span>
        </div>
        {rows.map((r, i) => {
          const dt = new Date(r.scanned_at);
          return (
            <div
              key={r.id}
              className={`grid grid-cols-3 px-4 py-3 text-xs text-gray-600 bg-white ${i < rows.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <span className="flex items-center gap-1.5 font-medium">
                {r.type === 'ingresso'
                  ? <LogIn  size={12} className="text-green-500 shrink-0" />
                  : <LogOut size={12} className="text-orange-400 shrink-0" />
                }
                {r.type === 'ingresso' ? 'Entrata' : 'Uscita'}
              </span>
              <span className="text-gray-500">{dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
              <span className="text-gray-500">{dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── DetailView ────────────────────────────────────────────────────────────────

const DetailView: React.FC<{
  ev: FullEvento;
  userId: string;
  onBack: () => void;
  onFeedback: () => void;
  onScan: () => void;
}> = ({ ev, userId, onBack, onFeedback, onScan }) => {
  const [tab, setTab]             = useState<'dettagli' | 'materiali' | 'registro'>('dettagli');
  const [materiali, setMateriali] = useState<{ id: string; titolo: string; tipo: string; url: string }[]>([]);
  const [certificato, setCertificato] = useState<CertificatoTemplate | null>(null);
  const [profilo, setProfilo]         = useState<{ first_name: string; last_name: string; school: string | null } | null>(null);
  const [generando, setGenerando]     = useState(false);
  const [haPartecipato, setHaPartecipato] = useState<boolean | null>(null);
  const gradient     = gradientForId(ev.id);
  const status       = eventoStatus(ev);
  const isConcluso   = status === 'concluso';
  const isConfermato = ev.statoIscrizione === 'accettata';

  const TABS = [
    { key: 'dettagli'  as const, label: 'Dettagli'         },
    { key: 'materiali' as const, label: 'Materiali'        },
    { key: 'registro'  as const, label: 'Registro' },
  ];

  useEffect(() => {
    supabase.from('materiali_eventi').select('*').eq('event_id', ev.id).order('created_at')
      .then(({ data }) => setMateriali((data ?? []) as any[]));

    supabase.from('certificati')
      .select('id, titolo, descrizione, immagine_url, campi_dinamici')
      .eq('event_id', ev.id)
      .eq('visibilita', 'studenti')
      .limit(1)
      .then(({ data }) => setCertificato(data?.[0] ?? null));

    supabase.from('profiles').select('first_name, last_name, school').eq('id', userId).single()
      .then(({ data }) => setProfilo(data ?? null));
  }, [ev.id, userId]);

  // Controlla se il certificato è stato assegnato all'utente dall'admin
  useEffect(() => {
    if (!certificato) { setHaPartecipato(null); return; }
    supabase.from('certificati_assegnazioni')
      .select('id', { count: 'exact', head: true })
      .eq('certificato_id', certificato.id)
      .eq('user_id', userId)
      .then(({ count }) => setHaPartecipato((count ?? 0) > 0));
  }, [certificato?.id, userId]);

  const handleDownloadCertificato = async () => {
    if (!certificato) return;
    setGenerando(true);
    try {
      await generateCertificatePDF(certificato, {
        nome:           profilo?.first_name ?? '',
        cognome:        profilo?.last_name ?? '',
        scuola:         profilo?.school ?? null,
        nome_evento:    ev.name,
        data_emissione: new Date(ev.event_end ?? ev.event_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
      });
    } catch {
      // errore silenzioso: la card rimane visibile
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto flex flex-col gap-4 pb-8" style={{ background: '#F8F9FA' }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 pt-3 text-xs font-semibold">
        <button onClick={onBack} className="flex items-center gap-0.5 text-orange-500 active:opacity-60 transition-opacity">
          <ChevronLeft size={13} /> I Miei
        </button>
        <span className="text-gray-300 mx-0.5">›</span>
        <span className="text-gray-400 truncate max-w-[160px]">{ev.name}</span>
      </div>

      {/* ── Card 1: Evento ── */}
      <div className="mx-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        {/* Foto incorniciata */}
        <div className="p-3">
          <div className="rounded-2xl overflow-hidden" style={{ height: 150 }}>
            {ev.cover_url
              ? <img src={ev.cover_url} alt={ev.name} className="w-full h-full object-cover" />
              : <div className={`bg-gradient-to-br ${gradient} w-full h-full`} />
            }
          </div>
        </div>

        {/* Intestazione compatta */}
        <div className="px-4 pt-1 pb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h1 className="font-bold font-montserrat text-[#0F172A] text-lg leading-snug flex-1">{ev.name}</h1>
            {isConfermato && (
              <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                isConcluso ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-600'
              }`}>
                {isConcluso ? 'Completato' : 'Confermato'}
              </span>
            )}
            {!isConfermato && (
              <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-500">
                In attesa
              </span>
            )}
          </div>
          {/* Metadati riga sintetica */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#64748B] font-medium">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <CalendarDays size={11} className="text-[#94A3B8] shrink-0" />
              {fmtDateRange(ev.event_date, ev.event_end)}
            </span>
            {ev.location && (
              <>
                <span className="text-[#CBD5E1]">•</span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <MapPin size={11} className="text-[#94A3B8] shrink-0" />
                  {ev.location}
                </span>
              </>
            )}
            {ev.max_partecipanti && (
              <>
                <span className="text-[#CBD5E1]">•</span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Users size={11} className="text-[#94A3B8] shrink-0" />
                  {ev.max_partecipanti} posti
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Card 2: Contenuto + Footer ── */}
      <div className="mx-4 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col">

        {/* Tab bar */}
        <div className="flex items-end gap-6 px-5 pt-5 pb-0">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="relative pb-3 text-sm transition-colors"
              style={{
                fontWeight: tab === key ? 700 : 500,
                color: tab === key ? '#0F172A' : '#94A3B8',
              }}
            >
              {label}
              {tab === key && (
                <span
                  className="absolute bottom-0 left-0 right-0 rounded-full"
                  style={{ height: 2, background: '#FF7A00' }}
                />
              )}
            </button>
          ))}
        </div>
        <div className="mx-5 border-b border-gray-100" />

        {/* Contenuto */}
        <div className="px-5 pt-5 pb-5 space-y-5">
          {tab === 'dettagli' && (
            <>
              {ev.descrizione && (
                <p className="text-sm text-[#475569] leading-relaxed">{ev.descrizione}</p>
              )}
              {ev.cosa_impari?.length > 0 && (
                <div>
                  <h2 className="font-bold font-montserrat text-[#0F172A] text-sm mb-2.5">Cosa porterai a casa</h2>
                  <ul className="space-y-2.5">
                    {ev.cosa_impari.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[#475569]">
                        <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h2 className="font-bold font-montserrat text-[#0F172A] text-sm mb-2">Requisiti</h2>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {ev.requisiti || 'Nessun requisito specifico.'}
                </p>
              </div>
            </>
          )}

          {tab === 'materiali' && (
            <div className="space-y-3">
              {/* Certificato — visibile solo se assegnato dall'admin */}
              {certificato && haPartecipato === true && (
                <button
                  onClick={handleDownloadCertificato}
                  disabled={generando}
                  className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl active:opacity-80 transition-opacity disabled:opacity-60"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    {generando
                      ? <div className="w-4 h-4 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                      : <ScrollText size={14} className="text-orange-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-[#0F172A] truncate">{certificato.titolo}</p>
                    <p className="text-xs text-orange-500 font-medium">{generando ? 'Generazione in corso…' : 'Tocca per scaricare il tuo certificato'}</p>
                  </div>
                  {!generando && <Download size={14} className="text-orange-400 shrink-0" />}
                </button>
              )}

              {/* Materiali standard */}
              {materiali.map(m => (
                <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl active:bg-orange-50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <BookOpen size={14} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] truncate">{m.titolo}</p>
                    <p className="text-xs text-gray-400">{m.tipo === 'link' ? 'Link esterno' : 'File'}</p>
                  </div>
                </a>
              ))}

              {haPartecipato !== true && materiali.length === 0 && (certificato === null || haPartecipato === false) && (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <BookOpen size={22} className="text-gray-300" />
                  </div>
                  <p className="font-bold font-montserrat text-gray-700 text-sm">Nessun materiale disponibile</p>
                  <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                    I materiali saranno caricati qualche giorno prima dell'evento.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'registro' && (
            <RegistroAttivita eventId={ev.id} userId={userId} />
          )}
        </div>

        {/* Footer bottoni */}
        <div className="border-t border-gray-100 px-4 py-4 flex items-center gap-3">
          <button onClick={onBack}
            className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-500 active:bg-gray-50 transition-all">
            Indietro
          </button>
          {isConfermato && !isConcluso && (
            <button onClick={onScan}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
              style={{ background: '#FF7A00', boxShadow: '0 4px 14px rgba(255,122,0,0.35)' }}>
              <QrCode size={15} /> Inquadra QR
            </button>
          )}
          {isConfermato && isConcluso && (
            <button onClick={onFeedback}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
              style={{ background: '#FF7A00', boxShadow: '0 4px 14px rgba(255,122,0,0.35)' }}>
              <MessageSquare size={15} /> Lascia Feedback
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── FeedbackForm ──────────────────────────────────────────────────────────────

const FeedbackForm: React.FC<{
  ev: FullEvento;
  onBack: () => void;
  onSuccess: () => void;
}> = ({ ev, onBack, onSuccess }) => {
  const [rating, setRating]             = useState<number | null>(null);
  const [positivo, setPositivo]         = useState('');
  const [miglioramento, setMiglioramento] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    setSubmitting(false);
    onSuccess();
  };

  return (
    <div className="max-w-md mx-auto flex flex-col min-h-full">
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 text-xs text-gray-400 font-medium">
        <button onClick={onBack} className="flex items-center gap-1 text-orange-500 font-bold">
          <ChevronLeft size={14} /> Indietro
        </button>
      </div>

      <div className="flex-1 px-4 py-4 space-y-6">
        <div>
          <h1 className="text-xl font-bold font-montserrat text-gray-900 mb-0.5">Feedback</h1>
          <p className="text-sm text-orange-500 font-semibold">{ev.name}</p>
        </div>

        <div>
          <p className="text-sm font-bold text-gray-700 mb-0.5">Aiutaci a migliorare le nostre esperienze</p>
          <p className="text-xs text-gray-400 mb-3">Come valuti l'esperienza? (1-5)</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)}
                className={`w-12 h-12 rounded-xl font-bold text-sm transition-all ${
                  rating === n ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700 block mb-2">Cosa ti è piaciuto di più?</label>
          <textarea
            value={positivo} onChange={e => setPositivo(e.target.value)}
            placeholder="Racconta la tua esperienza..."
            rows={4}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:border-orange-400 transition-colors"
          />
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700 block mb-2">Cosa potremmo migliorare?</label>
          <textarea
            value={miglioramento} onChange={e => setMiglioramento(e.target.value)}
            placeholder="I tuoi suggerimenti..."
            rows={4}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:border-orange-400 transition-colors"
          />
        </div>
      </div>

      <div className="px-4 pb-6 pt-3 border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={!rating || submitting}
          className="w-full py-3.5 rounded-2xl btn-primary-liquid font-bold text-sm disabled:opacity-40"
        >
          {submitting ? 'Invio in corso...' : 'Invia'}
        </button>
      </div>
    </div>
  );
};

// ── FeedbackSuccess ───────────────────────────────────────────────────────────

const FeedbackSuccess: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-full px-6 text-center gap-5">
    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
      <CheckCircle2 size={32} className="text-green-500" />
    </div>
    <div>
      <h2 className="text-xl font-bold font-montserrat text-gray-900 mb-1">Grazie per il feedback!</h2>
      <p className="text-sm text-gray-500">Hai guadagnato il badge "Feedback Champion"!</p>
    </div>
    <div className="w-full bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-6 text-white flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
        <MessageSquare size={28} className="text-white" />
      </div>
      <p className="font-bold font-montserrat text-lg">Feedback Champion</p>
      <p className="text-xs text-white/80">Hai completato il tuo primo feedback</p>
    </div>
    <button onClick={onBack} className="w-full py-3.5 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-600 hover:border-gray-300 transition-colors">
      Indietro
    </button>
  </div>
);

// ── Pagina principale ─────────────────────────────────────────────────────────

interface Props {
  user: UserProfile;
  onNavigate: (section: string) => void;
  onDetailChange?: (inDetail: boolean) => void;
}

export const IMieiPage: React.FC<Props> = ({ user, onNavigate, onDetailChange }) => {
  const [eventi, setEventi]           = useState<EventoIscritto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState<View>('list');
  const [selectedEv, setSelectedEv]   = useState<FullEvento | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [search, setSearch]           = useState('');
  const [filterStato, setFilterStato] = useState('Tutti');
  const [filterTipo, setFilterTipo]   = useState('Tutti');

  useEffect(() => {
    const load = async () => {
      const { data: iscrizioni } = await supabase
        .from('iscrizioni_eventi')
        .select('event_id, stato')
        .eq('user_id', user.id)
        .neq('stato', 'rifiutata');

      if (!iscrizioni || iscrizioni.length === 0) { setLoading(false); return; }

      const eventIds = iscrizioni.map((i: any) => i.event_id);

      const { data: evData } = await supabase
        .from('events')
        .select('id, name, event_date, event_end, location, cover_url, tipo, max_partecipanti')
        .in('id', eventIds);

      const statoMap: Record<string, string> = {};
      iscrizioni.forEach((i: any) => { statoMap[i.event_id] = i.stato; });

      const rows = (evData ?? []).map((e: any) => ({
        ...e,
        statoIscrizione: statoMap[e.id] ?? 'in_attesa',
      }));

      setEventi(rows as EventoIscritto[]);
      setLoading(false);
    };
    load();
  }, [user.id]);

  const fetchFull = async (ev: EventoIscritto): Promise<FullEvento> => {
    const { data } = await supabase.from('events').select('*').eq('id', ev.id).single();
    return {
      ...ev,
      descrizione:      data?.descrizione      ?? null,
      breve_descrizione: data?.breve_descrizione ?? null,
      cosa_impari:      data?.cosa_impari       ?? [],
      requisiti:        data?.requisiti         ?? null,
    };
  };

  const openDetail = async (ev: EventoIscritto) => {
    const full = await fetchFull(ev);
    setSelectedEv(full);
    setView('detail');
    onDetailChange?.(true);
  };

  const openFeedback = async (ev: EventoIscritto) => {
    if (selectedEv?.id !== ev.id) {
      const full = await fetchFull(ev);
      setSelectedEv(full);
    }
    setView('feedback');
    onDetailChange?.(true);
  };

  const handleScan = async (text: string) => {
    setShowScanner(false);
    const result = await processQrScan(text, user.id);
    setScanResult(result);
    setTimeout(() => setScanResult(null), 4000);
  };

  const backToList = () => { setView('list'); onDetailChange?.(false); };
  const backToDetail = () => setView('detail');

  // ── Vista dettaglio
  if (view === 'detail' && selectedEv) return (
    <>
      <DetailView
        ev={selectedEv}
        userId={user.id}
        onBack={backToList}
        onFeedback={() => setView('feedback')}
        onScan={() => setShowScanner(true)}
      />
      {showScanner && <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </>
  );

  // ── Vista feedback
  if (view === 'feedback' && selectedEv) return (
    <FeedbackForm
      ev={selectedEv}
      onBack={backToDetail}
      onSuccess={() => setView('success')}
    />
  );

  // ── Vista successo feedback
  if (view === 'success') return (
    <FeedbackSuccess onBack={() => { setView('list'); setSelectedEv(null); onDetailChange?.(false); }} />
  );

  // ── Vista lista
  return (
    <div className="min-h-full">
      {showScanner && <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {/* Toast risultato scan */}
      {scanResult && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl shadow-xl border p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
          scanResult.ok ? 'bg-white border-gray-100' : 'bg-red-50 border-red-100'
        }`}>
          <CheckCircle2 size={16} className={scanResult.ok ? 'text-green-500' : 'text-red-400'} />
          <p className="text-xs font-semibold text-gray-700 flex-1">{scanResult.msg}</p>
          <button onClick={() => setScanResult(null)} className="text-gray-300 hover:text-gray-500 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-4 pb-3">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold font-montserrat text-gray-900 mb-3">Miei eventi</h1>

          {/* Cerca */}
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cerca..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-input text-sm"
            />
          </div>

          {/* Filtri */}
          <div className="flex gap-2">
            <select
              value={filterStato}
              onChange={e => setFilterStato(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer"
            >
              <option value="Tutti">Seleziona filtro...</option>
              <option value="Confermata">Confermata</option>
              <option value="In attesa">In attesa</option>
              <option value="Completato">Completato</option>
            </select>
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-2xl glass-input text-xs font-medium appearance-none cursor-pointer"
            >
              <option value="Tutti">Seleziona filtro...</option>
              {[...new Set(eventi.map(e => e.tipo).filter(Boolean))].map(t => (
                <option key={t!} value={t!}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-6 pt-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          </div>
        ) : (() => {
          const filtered = eventi.filter(ev => {
            const matchSearch = !search || ev.name.toLowerCase().includes(search.toLowerCase());
            const status = eventoStatus(ev);
            const statoLabel = ev.statoIscrizione === 'accettata'
              ? (status === 'concluso' ? 'Completato' : 'Confermata')
              : 'In attesa';
            const matchStato = filterStato === 'Tutti' || statoLabel === filterStato;
            const matchTipo  = filterTipo  === 'Tutti' || ev.tipo === filterTipo;
            return matchSearch && matchStato && matchTipo;
          });

          if (filtered.length === 0) return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Compass size={28} className="text-gray-400" />
              </div>
              <p className="font-bold font-montserrat text-gray-700">
                {eventi.length === 0 ? 'Nessuna iscrizione' : 'Nessun risultato'}
              </p>
              <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
                {eventi.length === 0
                  ? 'Esplora le esperienze disponibili e iscriviti a quelle che ti interessano.'
                  : 'Prova a modificare i filtri di ricerca.'}
              </p>
              {eventi.length === 0 && (
                <button onClick={() => onNavigate('esperienze')} className="mt-2 px-5 py-2.5 rounded-2xl btn-primary-liquid text-sm font-bold">
                  Scopri esperienze
                </button>
              )}
            </div>
          );

          return (
            <div className="space-y-3">
              {filtered.map(ev => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  onDetail={() => openDetail(ev)}
                  onScan={() => setShowScanner(true)}
                  onFeedback={() => openFeedback(ev)}
                />
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
