import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, User, Activity, Award, Shield,
  LogOut, Check, X, Plus, CheckCircle2, Star, MapPin,
  Lock, Monitor, Download, Trash2,
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

type SettingsTab = 'account' | 'attivita' | 'badge' | 'sicurezza' | 'visibilita';
type EditingField = 'nome' | 'bio' | 'interessi' | null;

const SETTINGS_TABS: { key: SettingsTab; label: string; Icon: React.ElementType }[] = [
  { key: 'account',    label: 'Account',    Icon: User     },
  { key: 'attivita',   label: 'Attività',   Icon: Activity },
  { key: 'badge',      label: 'Badge',      Icon: Award    },
  { key: 'sicurezza',  label: 'Sicurezza',  Icon: Lock     },
  { key: 'visibilita', label: 'Visibilità e Privacy', Icon: Shield },
];

interface Props {
  user: UserProfile;
  onBack: () => void;
  onLogout: () => void;
  onUserUpdate?: (updates: Partial<UserProfile>) => void;
}

// ── Tab Account ───────────────────────────────────────────────────────────────
const AccountTab: React.FC<{ user: UserProfile; onUserUpdate?: (u: Partial<UserProfile>) => void }> = ({
  user,
  onUserUpdate,
}) => {
  // Display state — fonte di verità locale, aggiornata dopo ogni salvataggio
  const [displayFirstName, setDisplayFirstName] = useState(user.first_name || '');
  const [displayLastName, setDisplayLastName]   = useState(user.last_name || '');
  const [displayBio, setDisplayBio]             = useState(user.bio || '');
  const [displayInterests, setDisplayInterests] = useState<string[]>(user.interests || []);

  // Draft state — usato solo mentre si modifica un campo
  const [draftFirstName, setDraftFirstName] = useState('');
  const [draftLastName, setDraftLastName]   = useState('');
  const [draftBio, setDraftBio]             = useState('');
  const [draftInterests, setDraftInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput]   = useState('');

  const [editing, setEditing] = useState<EditingField>(null);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  const initials = `${displayFirstName[0] || ''}${displayLastName[0] || ''}`.toUpperCase() || '?';

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const openEdit = (field: EditingField) => {
    setEditing(field);
    if (field === 'nome') {
      setDraftFirstName(displayFirstName);
      setDraftLastName(displayLastName);
    }
    if (field === 'bio') setDraftBio(displayBio);
    if (field === 'interessi') { setDraftInterests([...displayInterests]); setInterestInput(''); }
  };

  const cancelEdit = () => setEditing(null);

  const saveField = async (field: EditingField) => {
    setSaving(true);
    let payload: Record<string, unknown> = {};
    if (field === 'nome')      payload = { first_name: draftFirstName.trim(), last_name: draftLastName.trim() };
    if (field === 'bio')       payload = { bio: draftBio.trim() };
    if (field === 'interessi') payload = { interests: draftInterests };

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id);
    setSaving(false);

    if (error) {
      showToast('Errore nel salvataggio', false);
      return;
    }

    // Aggiorna stato locale e notifica il parent
    if (field === 'nome') {
      setDisplayFirstName(draftFirstName.trim());
      setDisplayLastName(draftLastName.trim());
      onUserUpdate?.({ first_name: draftFirstName.trim(), last_name: draftLastName.trim() });
    }
    if (field === 'bio') {
      setDisplayBio(draftBio.trim());
      onUserUpdate?.({ bio: draftBio.trim() });
    }
    if (field === 'interessi') {
      setDisplayInterests([...draftInterests]);
      onUserUpdate?.({ interests: [...draftInterests] });
    }
    setEditing(null);
    showToast('Salvato');
  };

  const addInterest = () => {
    const val = interestInput.trim();
    if (!val || draftInterests.length >= 3 || draftInterests.includes(val)) return;
    setDraftInterests(prev => [...prev, val]);
    setInterestInput('');
  };

  return (
    <div className="px-4 py-5 space-y-4 max-w-md mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl shadow-xl border p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${toast.ok ? 'bg-white border-gray-100' : 'bg-red-50 border-red-100'}`}>
          {toast.ok
            ? <Check size={16} className="text-green-500 shrink-0" />
            : <X    size={16} className="text-red-500 shrink-0" />}
          <p className={`text-xs font-semibold flex-1 ${toast.ok ? 'text-gray-700' : 'text-red-600'}`}>{toast.msg}</p>
        </div>
      )}

      {/* ── Card profilo ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 flex items-start gap-4">
        {/* Avatar circolare */}
        <div className="w-16 h-16 rounded-full bg-orange-50 border-2 border-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl shrink-0 mt-2">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold font-montserrat text-gray-900 text-base leading-tight mb-1">
            {displayFirstName} {displayLastName}
          </h2>

          {displayBio ? (
            <p className="text-xs text-gray-400 leading-relaxed mb-2.5 line-clamp-2">{displayBio}</p>
          ) : (
            <p className="text-xs text-gray-300 italic mb-2.5">Aggiungi una bio...</p>
          )}

          {displayInterests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {displayInterests.map((tag, i) => (
                <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-500 border border-orange-100">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Award size={13} className="text-orange-400" />
              0 badge
            </span>
            <span className="w-px h-3.5 bg-gray-200" />
            <span className="flex items-center gap-1.5">
              <Activity size={13} className="text-orange-400" />
              0 esperienze
            </span>
          </div>
        </div>
      </div>

      {/* ── Card dati account ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Nome */}
        <FieldRow
          label="Nome"
          onEdit={() => openEdit('nome')}
          editing={editing === 'nome'}
          saving={saving}
          onSave={() => saveField('nome')}
          onCancel={cancelEdit}
        >
          {editing === 'nome' ? (
            <div className="flex gap-2 mt-2">
              <input
                value={draftFirstName}
                onChange={e => setDraftFirstName(e.target.value)}
                placeholder="Nome"
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-orange-300 transition-colors"
              />
              <input
                value={draftLastName}
                onChange={e => setDraftLastName(e.target.value)}
                placeholder="Cognome"
                className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-orange-300 transition-colors"
              />
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-900">{displayFirstName} {displayLastName}</p>
          )}
        </FieldRow>

        <Divider />

        {/* Email — sola lettura */}
        <FieldRow label="Email">
          <p className="text-sm font-semibold text-gray-900">{user.email}</p>
        </FieldRow>

        <Divider />

        {/* Bio */}
        <FieldRow
          label="Bio"
          onEdit={() => openEdit('bio')}
          editing={editing === 'bio'}
          saving={saving}
          onSave={() => saveField('bio')}
          onCancel={cancelEdit}
        >
          {editing === 'bio' ? (
            <div className="mt-2">
              <textarea
                value={draftBio}
                onChange={e => setDraftBio(e.target.value.slice(0, 160))}
                placeholder="Scrivi qualcosa su di te..."
                rows={3}
                className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-orange-300 resize-none transition-colors"
              />
              <p className="text-[10px] text-gray-400 text-right mt-0.5">{draftBio.length}/160</p>
            </div>
          ) : (
            <p className="text-sm text-gray-900">
              {displayBio || <span className="text-gray-400 italic text-xs">Non inserita</span>}
            </p>
          )}
        </FieldRow>

        <Divider />

        {/* Interessi */}
        <FieldRow
          label="Interessi"
          onEdit={() => openEdit('interessi')}
          editing={editing === 'interessi'}
          saving={saving}
          onSave={() => saveField('interessi')}
          onCancel={cancelEdit}
        >
          {editing === 'interessi' ? (
            <div className="mt-2 space-y-2">
              {draftInterests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {draftInterests.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-500">
                      {tag}
                      <button
                        onClick={() => setDraftInterests(prev => prev.filter((_, idx) => idx !== i))}
                        className="ml-0.5 text-orange-400 hover:text-orange-600"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {draftInterests.length < 3 ? (
                <div className="flex gap-2">
                  <input
                    value={interestInput}
                    onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addInterest()}
                    placeholder={`Aggiungi interesse (${3 - draftInterests.length} rimast${3 - draftInterests.length === 1 ? 'o' : 'i'})`}
                    className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:border-orange-300 transition-colors"
                  />
                  <button
                    onClick={addInterest}
                    disabled={!interestInput.trim()}
                    className="px-3 py-2 rounded-xl bg-orange-50 text-orange-500 disabled:opacity-40 transition-opacity"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic">Massimo 3 interessi raggiunto</p>
              )}
            </div>
          ) : (
            <div className="mt-1">
              {displayInterests.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {displayInterests.map((tag, i) => (
                    <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-500">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Non inseriti</p>
              )}
            </div>
          )}
        </FieldRow>

        <Divider />

        {/* Data di nascita — sola lettura */}
        <FieldRow label="Data di nascita">
          <p className="text-sm font-semibold text-gray-900">
            {user.dob
              ? (() => {
                  try {
                    return new Date(user.dob + 'T00:00:00').toLocaleDateString('it-IT', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    });
                  } catch { return user.dob; }
                })()
              : <span className="text-gray-400 italic text-xs">Non inserita</span>
            }
          </p>
        </FieldRow>
      </div>
    </div>
  );
};

// ── Helpers UI ─────────────────────────────────────────────────────────────────
const Divider: React.FC = () => <div className="mx-5 h-px bg-gray-50" />;

const FieldRow: React.FC<{
  label: string;
  onEdit?: () => void;
  editing?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
}> = ({ label, onEdit, editing, saving, onSave, onCancel, children }) => (
  <div className="px-5 py-4">
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      {editing ? (
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-[11px] text-gray-400 font-semibold">Annulla</button>
          <button
            onClick={onSave}
            disabled={saving}
            className="text-[11px] text-orange-500 font-bold disabled:opacity-50"
          >
            {saving ? 'Salvo...' : 'Salva'}
          </button>
        </div>
      ) : onEdit ? (
        <button onClick={onEdit} className="text-[11px] text-orange-500 font-bold">Modifica</button>
      ) : null}
    </div>
    {children}
  </div>
);

// ── Tab Attività ──────────────────────────────────────────────────────────────
type ActivityType = 'completato' | 'iscritto' | 'checkin' | 'badge';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle?: string;
  date: string;
  hasAction?: boolean;
}

// Dati mock — da sostituire con fetch Supabase (attendances JOIN events + badges)
const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'completato',
    title: 'Completato: Robotica Lab',
    subtitle: "Badge ottenuto: 'Robotics Enthusiast'",
    date: '26 Ottobre 2025',
  },
  {
    id: '2',
    type: 'iscritto',
    title: 'Iscritto: AI Hackathon Milano 2025',
    subtitle: '15–17 Novembre 2025',
    date: '',
    hasAction: true,
  },
];

const ACTIVITY_CONFIG: Record<ActivityType, { bg: string; Icon: React.ElementType; color: string }> = {
  completato: { bg: 'bg-green-100',  Icon: CheckCircle2, color: 'text-green-500'  },
  iscritto:   { bg: 'bg-orange-100', Icon: Star,         color: 'text-orange-500' },
  checkin:    { bg: 'bg-blue-100',   Icon: MapPin,        color: 'text-blue-500'   },
  badge:      { bg: 'bg-violet-100', Icon: Award,         color: 'text-violet-500' },
};

const AttivitaTab: React.FC = () => {
  const activities = MOCK_ACTIVITIES; // ← sostituire con: await supabase.from('attendances').select(...)

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Activity size={24} className="text-gray-400" />
        </div>
        <p className="font-bold font-montserrat text-gray-700">Nessuna attività</p>
        <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
          Le tue partecipazioni ed esperienze appariranno qui
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-md mx-auto">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-3">
        {activities.length} attività recenti
      </p>
      <div className="space-y-3">
        {activities.map(activity => {
          const { bg, Icon, color } = ACTIVITY_CONFIG[activity.type];
          return (
            <div
              key={activity.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-start gap-4"
            >
              {/* Icona stato */}
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon size={18} className={color} strokeWidth={2} />
              </div>

              {/* Testo */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900 leading-snug mb-0.5">{activity.title}</p>
                {activity.subtitle && (
                  <p className="text-xs text-gray-400 leading-snug mb-1">{activity.subtitle}</p>
                )}
                {activity.date && (
                  <p className="text-[10px] text-gray-300 font-medium mb-2">{activity.date}</p>
                )}
                {activity.hasAction && (
                  <button className="text-[11px] font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
                    Mostra dettagli
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Tab Badge ─────────────────────────────────────────────────────────────────
interface BadgeItem {
  id: string;
  name: string;
  description: string;
  date: string;
  Icon: React.ElementType;
  color: string;
  bg: string;
}

const MOCK_BADGES: BadgeItem[] = [
  {
    id: '1',
    name: 'Robotics Enthusiast',
    description: 'Completato il corso Robotica Lab',
    date: '26 Ottobre 2025',
    Icon: Award,
    color: 'text-violet-500',
    bg: 'bg-violet-100',
  },
  {
    id: '2',
    name: 'AI Pioneer',
    description: "Partecipato all'AI Hackathon Milano",
    date: '17 Novembre 2025',
    Icon: Star,
    color: 'text-orange-500',
    bg: 'bg-orange-100',
  },
];

const BadgeTab: React.FC = () => {
  const badges = MOCK_BADGES; // ← da sostituire con fetch Supabase

  if (badges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Award size={24} className="text-gray-400" />
        </div>
        <p className="font-bold font-montserrat text-gray-700">Nessun badge ancora</p>
        <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
          Completa esperienze e partecipa agli eventi per guadagnare badge
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 max-w-md mx-auto">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-3">
        {badges.length} badge ottenuti
      </p>
      <div className="grid grid-cols-2 gap-3">
        {badges.map(badge => {
          const { Icon } = badge;
          return (
            <div
              key={badge.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center"
            >
              <div className={`w-14 h-14 ${badge.bg} rounded-2xl flex items-center justify-center mb-3 shadow-sm`}>
                <Icon size={26} className={badge.color} strokeWidth={1.75} />
              </div>
              <p className="font-bold font-montserrat text-gray-900 text-xs leading-snug mb-1">{badge.name}</p>
              <p className="text-[10px] text-gray-400 leading-snug mb-2">{badge.description}</p>
              <p className="text-[9px] text-gray-300 font-medium">{badge.date}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Tab Sicurezza ─────────────────────────────────────────────────────────────
const SicurezzaTab: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pwdError, setPwdError] = useState('');
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ loginAt: string; expiresAt: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      const fmt = (iso: string) =>
        new Date(iso).toLocaleString('it-IT', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
      setSessionInfo({
        loginAt:   fmt(data.session.user.last_sign_in_at ?? data.session.user.created_at),
        expiresAt: fmt(new Date(data.session.expires_at! * 1000).toISOString()),
      });
    });
  }, []);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { setPwdError('La password deve essere di almeno 8 caratteri'); setPwdStatus('error'); return; }
    if (newPassword !== confirmPassword) { setPwdError('Le password non coincidono'); setPwdStatus('error'); return; }
    setSavingPwd(true); setPwdStatus('idle'); setPwdError('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) { setPwdError(error.message); setPwdStatus('error'); }
    else { setPwdStatus('success'); setNewPassword(''); setConfirmPassword(''); setTimeout(() => { setShowPasswordForm(false); setPwdStatus('idle'); }, 2000); }
  };

  const cancelPasswordForm = () => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword(''); setPwdStatus('idle'); setPwdError(''); };

  return (
    <div className="px-4 py-5 max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* ── Password ── */}
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-bold font-montserrat text-gray-900 text-sm">Password</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{user.email}</p>
          </div>
          {!showPasswordForm && (
            <button onClick={() => setShowPasswordForm(true)} className="text-xs font-bold text-orange-500 shrink-0 mt-0.5">
              Cambia
            </button>
          )}
        </div>

        {showPasswordForm && (
          <div className="px-5 pb-5 pt-0 space-y-3 border-t border-gray-50">
            <div className="pt-4">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nuova password</label>
              <input
                type="password" value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                placeholder="Min. 8 caratteri"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 placeholder-gray-300"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conferma nuova password</label>
              <input
                type="password" value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                placeholder="Ripeti la password"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 placeholder-gray-300"
              />
            </div>
            {pwdStatus === 'error' && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{pwdError}</p>}
            {pwdStatus === 'success' && (
              <p className="text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Password aggiornata
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={cancelPasswordForm} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-bold">Annulla</button>
              <button onClick={handleChangePassword} disabled={savingPwd || !newPassword || !confirmPassword} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-50">
                {savingPwd ? 'Salvataggio…' : 'Aggiorna'}
              </button>
            </div>
          </div>
        )}

        <div className="h-px bg-gray-50" />

        {/* ── 2FA ── */}
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-bold font-montserrat text-gray-900 text-sm">Autenticazione a due fattori</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Aggiungi un livello di sicurezza extra</p>
          </div>
          <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-2 py-1 rounded-full uppercase tracking-wide shrink-0 mt-0.5 whitespace-nowrap">
            Prossim.
          </span>
        </div>

        <div className="h-px bg-gray-50" />

        {/* ── Sessioni ── */}
        <button
          onClick={() => setSessionsOpen((o: boolean) => !o)}
          className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left"
        >
          <div className="min-w-0">
            <p className="font-bold font-montserrat text-gray-900 text-sm">Sessioni attive</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Visualizza i dispositivi connessi</p>
          </div>
          <span className="text-xs font-bold text-orange-500 shrink-0 mt-0.5">
            {sessionsOpen ? 'Chiudi' : 'Visualizza'}
          </span>
        </button>

        {sessionsOpen && (
          <div className="px-5 pb-5 pt-0 border-t border-gray-50">
            <div className="flex items-start gap-3 pt-4">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
                <Monitor size={16} className="text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold font-montserrat text-gray-900">Dispositivo corrente</p>
                  <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                </div>
                {sessionInfo ? (
                  <>
                    <p className="text-[11px] text-gray-400 mt-0.5">Accesso: {sessionInfo.loginAt}</p>
                    <p className="text-[11px] text-gray-400">Scade: {sessionInfo.expiresAt}</p>
                  </>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-0.5">Sessione attiva</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tab Visibilità, Privacy e Dati ────────────────────────────────────────────
const AZIENDE_VEDONO = [
  { label: 'Nome, età e località',                    visible: true  },
  { label: 'Bio',                                     visible: true  },
  { label: 'Interessi e competenze',                  visible: true  },
  { label: 'Badge ottenuti ed esperienze completate', visible: true  },
  { label: 'Informazioni di contatto personali (email, telefono)', visible: false },
];

const VisibilitaTab: React.FC<{ user: UserProfile; onLogout: () => void }> = ({ user, onLogout }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();

    // Prende tutte le presenze con il nome evento, deduplica per event_id
    const { data: attendances } = await supabase
      .from('attendances')
      .select('event_id, events(name)')
      .eq('user_id', user.id);

    const eventiCompletati = [
      ...new Map(
        (attendances ?? []).map((a: Record<string, unknown>) => {
          const ev = a.events as Record<string, unknown> | null;
          return [a.event_id as string, (ev?.name ?? a.event_id) as string];
        })
      ).values(),
    ].join(' | ');

    const interests = Array.isArray(profile?.interests)
      ? (profile.interests as string[]).join(' | ') : '';

    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const rows = [
      'Nome,Cognome,Email,Scuola,DataNascita,Bio,Interessi,EventiCompletati',
      [
        esc(profile?.first_name), esc(profile?.last_name), esc(profile?.email),
        esc(profile?.school), esc(profile?.dob),
        esc(profile?.bio), esc(interests),
        esc(eventiCompletati),
      ].join(','),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `jumpin_dati_${user.id.slice(0, 8)}.csv`; link.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { error } = await supabase.rpc('delete_user');
    if (error) { setDeleting(false); setShowDeleteConfirm(false); alert('Errore durante la cancellazione. Riprova.'); return; }
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="px-4 py-5 max-w-md mx-auto space-y-5">

      {/* Visibilità profilo */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-3">Visibilità profilo</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Banner attivo */}
          <div className="mx-4 mt-4 mb-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-start gap-2">
            <Star size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold font-montserrat text-gray-700">Profilo attivo</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Il tuo profilo è ora visibile alle aziende. Assicurati di tenere aggiornate le tue competenze e badge per massimizzare le opportunità.
              </p>
            </div>
          </div>

          {/* Checklist */}
          <div className="px-5 pb-4">
            <p className="text-xs font-bold text-gray-700 mb-2">Cosa vedono le aziende?</p>
            <div className="space-y-2">
              {AZIENDE_VEDONO.map(({ label, visible }) => (
                <div key={label} className="flex items-center gap-2">
                  {visible
                    ? <CheckCircle2 size={15} className="text-orange-400 shrink-0" />
                    : <X size={15} className="text-gray-300 shrink-0" />
                  }
                  <span className={`text-xs ${visible ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Azioni */}
      <div className="space-y-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 text-sm font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Download size={16} className="text-gray-400" />
          {exporting ? 'Preparazione…' : 'Esporta i miei dati'}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-3 rounded-2xl border border-red-100 bg-white text-red-500 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
        >
          <Trash2 size={16} className="text-red-400" />
          Cancella account
        </button>
      </div>

      {/* Modal conferma */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex justify-end px-4 pt-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-2 text-center">
              <p className="font-bold font-montserrat text-gray-900 text-base mb-2 leading-snug">
                Vuoi cancellare il tuo account?
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Se confermi, non potrai più accedere a Jumpin' e sfruttare le funzionalità della piattaforma
              </p>
            </div>
            <div className="flex gap-3 px-6 py-5">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {deleting ? 'Eliminazione…' : 'Conferma'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Pagina principale ─────────────────────────────────────────────────────────
export const ProfileSettingsPage: React.FC<Props> = ({ user, onBack, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const initials = `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || '?';

  return (
    <div className="fixed inset-0 bg-gray-50 z-40 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div
        className="bg-white border-b border-gray-100 flex items-center gap-3 px-4 shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: '12px' }}
      >
        <button onClick={onBack} className="-ml-1 p-1.5 text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900 leading-tight truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{user.school}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-100 flex shrink-0">
        {SETTINGS_TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors border-b-2 ${
                active ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent'
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenuto */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {activeTab === 'account'    && <AccountTab user={user} onUserUpdate={onUserUpdate} />}
        {activeTab === 'attivita'   && <AttivitaTab />}
        {activeTab === 'badge'      && <BadgeTab />}
        {activeTab === 'sicurezza'  && <SicurezzaTab user={user} />}
        {activeTab === 'visibilita' && <VisibilitaTab user={user} onLogout={onLogout} />}
      </div>
    </div>
  );
};
