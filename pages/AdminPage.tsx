import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { JumpInEvent, UserProfile } from '../types';
import { GlassCard } from '../components/GlassCard';
import QRCode from 'qrcode';
import {
  LogOut, Plus, Download, FileDown, Calendar, MapPin,
  QrCode, AlertCircle, Loader2, ArrowLeft,
} from 'lucide-react';

type QrPair = { ingresso: string; uscita: string };

const AdminPage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<JumpInEvent[]>([]);
  const [qrCodes, setQrCodes] = useState<Record<string, QrPair>>({});
  const [newEvent, setNewEvent] = useState({ id: '', name: '', event_date: '', location: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single();

    setUser(profile as UserProfile);
    if (profile?.is_admin) await loadEvents();
    setLoading(false);
  };

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events').select('*').order('event_date', { ascending: false });
    if (!data) return;
    setEvents(data as JumpInEvent[]);

    const codes: Record<string, QrPair> = {};
    for (const ev of data) {
      const opts = { width: 300, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } };
      const [ingresso, uscita] = await Promise.all([
        QRCode.toDataURL(`JUMPIN|${ev.id}|ingresso`, opts),
        QRCode.toDataURL(`JUMPIN|${ev.id}|uscita`, opts),
      ]);
      codes[ev.id] = { ingresso, uscita };
    }
    setQrCodes(codes);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    if (!newEvent.id.trim() || !newEvent.name.trim() || !newEvent.event_date) {
      setCreateError('Compila tutti i campi obbligatori.');
      setCreating(false);
      return;
    }
    const { error } = await supabase.from('events').insert({
      id: newEvent.id.trim().toLowerCase().replace(/\s+/g, '_'),
      name: newEvent.name.trim(),
      event_date: newEvent.event_date,
      location: newEvent.location.trim(),
    });
    if (error) {
      setCreateError(error.message.includes('duplicate') ? 'ID evento già esistente.' : error.message);
      setCreating(false);
      return;
    }
    setNewEvent({ id: '', name: '', event_date: '', location: '' });
    await loadEvents();
    setCreating(false);
  };

  const downloadQR = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const exportCSV = async (eventId: string) => {
    setExportingId(eventId);
    const { data, error } = await supabase
      .from('attendances')
      .select('id, type, scanned_at, profiles!user_id(first_name, last_name, email, school, dob)')
      .eq('event_id', eventId)
      .order('scanned_at');
    setExportingId(null);
    if (error || !data?.length) {
      alert(!data?.length ? 'Nessuna presenza per questo evento.' : 'Errore nel recupero dati.');
      return;
    }
    const rows = data.map((a) => {
      const p = a.profiles as unknown as { first_name: string; last_name: string; email: string; school: string; dob: string } | null;
      return [p?.first_name ?? '', p?.last_name ?? '', p?.email ?? '', p?.school ?? '', p?.dob ?? '',
        a.type, new Date(a.scanned_at).toLocaleString('it-IT')]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '﻿' + 'Nome,Cognome,Email,Scuola,DataNascita,Tipo,DataOra\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presenze_${eventId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={40} className="text-orange-400 animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="text-center max-w-sm w-full">
        <AlertCircle size={40} className="text-orange-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold font-montserrat text-gray-800 mb-2">Login richiesto</h2>
        <p className="text-gray-500 text-sm mb-6">Effettua il login per accedere alla dashboard admin.</p>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl btn-primary-liquid font-bold text-sm">
          <ArrowLeft size={16} /> Vai al Login
        </a>
      </GlassCard>
    </div>
  );

  if (!user.is_admin) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="text-center max-w-sm w-full">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold font-montserrat text-gray-800 mb-2">Accesso negato</h2>
        <p className="text-gray-500 text-sm mb-6">Non hai i permessi per accedere a questa sezione.</p>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl btn-primary-liquid font-bold text-sm">
          <ArrowLeft size={16} /> Torna alla Dashboard
        </a>
      </GlassCard>
    </div>
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center font-bold text-xl text-white shadow-lg rotate-3">JI</div>
          <div>
            <h1 className="text-2xl font-bold font-montserrat tracking-tight text-gray-800">Admin</h1>
            <p className="text-[10px] text-orange-400 font-bold tracking-widest uppercase -mt-1">Dashboard</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-3 rounded-2xl bg-white/60 hover:bg-red-50 hover:text-red-500 transition-all text-gray-400 border border-white shadow-sm">
          <LogOut size={22} />
        </button>
      </div>

      <GlassCard className="mb-8">
        <h2 className="text-lg font-bold font-montserrat text-gray-800 mb-6 flex items-center gap-2">
          <Plus size={20} className="text-orange-500" /> Nuovo Evento
        </h2>
        {createError && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50/80 border border-red-100 flex items-center gap-3 text-red-600">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-xs font-bold">{createError}</p>
          </div>
        )}
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">ID Evento *</label>
              <input type="text" required placeholder="es. jumpin_2026_06" className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                value={newEvent.id} onChange={(e) => setNewEvent({ ...newEvent, id: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Data *</label>
              <input type="date" required className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                value={newEvent.event_date} onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nome Evento *</label>
            <input type="text" required placeholder="es. JumpIn - Giugno 2026" className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
              value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Location</label>
            <input type="text" placeholder="es. Rimini" className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
              value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} />
          </div>
          <button type="submit" disabled={creating}
            className="w-full py-4 rounded-2xl btn-primary-liquid font-bold flex items-center justify-center gap-2 disabled:opacity-70">
            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {creating ? 'Creazione...' : 'Crea Evento'}
          </button>
        </form>
      </GlassCard>

      <h2 className="text-lg font-bold font-montserrat text-gray-700 mb-4 px-2">Eventi ({events.length})</h2>

      {events.length === 0 ? (
        <GlassCard className="text-center py-12">
          <QrCode size={40} className="text-orange-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nessun evento ancora. Creane uno sopra.</p>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {events.map((ev) => (
            <GlassCard key={ev.id}>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold font-montserrat text-gray-900">{ev.name}</h3>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Calendar size={14} className="text-orange-400" />
                      {new Date(ev.event_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <MapPin size={14} className="text-orange-400" />
                        {ev.location}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-lg">{ev.id}</span>
                  </div>
                </div>
                <button onClick={() => exportCSV(ev.id)} disabled={exportingId === ev.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all disabled:opacity-60 shrink-0 ml-4">
                  {exportingId === ev.id ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  CSV
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(['ingresso', 'uscita'] as const).map((tipo) => (
                  <div key={tipo} className="flex flex-col items-center p-4 rounded-3xl bg-white/50 border border-white/60">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-500">
                      {tipo === 'ingresso' ? '🟢 Ingresso' : '🔴 Uscita'}
                    </p>
                    {qrCodes[ev.id] ? (
                      <img src={qrCodes[ev.id][tipo]} alt={`QR ${tipo}`} className="w-40 h-40 rounded-2xl" />
                    ) : (
                      <div className="w-40 h-40 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Loader2 size={24} className="text-orange-300 animate-spin" />
                      </div>
                    )}
                    <button onClick={() => qrCodes[ev.id] && downloadQR(qrCodes[ev.id][tipo], `qr_${ev.id}_${tipo}.png`)}
                      disabled={!qrCodes[ev.id]}
                      className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white hover:bg-orange-50 border border-orange-100 text-orange-600 text-xs font-bold transition-all disabled:opacity-50">
                      <Download size={13} /> Scarica PNG
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
