import React, { useState } from 'react';
import {
  ChevronLeft, User, Activity, Award, Shield, Eye,
  LogOut, Check, X, Plus,
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

type SettingsTab = 'account' | 'attivita' | 'badge' | 'sicurezza' | 'visibilita';
type EditingField = 'nome' | 'bio' | 'interessi' | null;

const SETTINGS_TABS: { key: SettingsTab; label: string; Icon: React.ElementType }[] = [
  { key: 'account',    label: 'Account',    Icon: User     },
  { key: 'attivita',   label: 'Attività',   Icon: Activity },
  { key: 'badge',      label: 'Badge',      Icon: Award    },
  { key: 'sicurezza',  label: 'Sicurezza',  Icon: Shield   },
  { key: 'visibilita', label: 'Visibilità', Icon: Eye      },
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

// ── Placeholder tab ───────────────────────────────────────────────────────────
const ComingSoonTab: React.FC<{ title: string; Icon: React.ElementType }> = ({ title, Icon }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
      <Icon size={24} className="text-gray-400" />
    </div>
    <p className="font-bold font-montserrat text-gray-700">{title}</p>
    <p className="text-xs text-gray-400">Sezione in arrivo</p>
  </div>
);

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
        {activeTab === 'attivita'   && <ComingSoonTab title="Attività" Icon={Activity} />}
        {activeTab === 'badge'      && <ComingSoonTab title="Badge" Icon={Award} />}
        {activeTab === 'sicurezza'  && <ComingSoonTab title="Sicurezza" Icon={Shield} />}
        {activeTab === 'visibilita' && <ComingSoonTab title="Visibilità" Icon={Eye} />}
      </div>
    </div>
  );
};
