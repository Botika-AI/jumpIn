import React, { useState, useEffect, useRef } from 'react';
import { Award, Briefcase, X, Send, MapPin, CheckCircle2, ChevronDown, Check } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  school: string | null;
  dob: string | null;
  citta: string | null;
  bio: string | null;
  interests: string[];
  badge_count: number;
  event_count: number;
  is_saved?: boolean;
  is_contacted?: boolean;
}

export type ActivityLevel = 'Alto' | 'Medio' | 'Basso';

// ── Helpers ───────────────────────────────────────────────────────────────

export function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return age;
}

export function initials(p: Profile): string {
  return `${(p.first_name || '')[0] || ''}${(p.last_name || '')[0] || ''}`.toUpperCase() || '?';
}

export function displayName(p: Profile): string {
  return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Utente';
}

export function activityLevel(p: Profile): ActivityLevel {
  const score = p.badge_count + p.event_count;
  if (score >= 6) return 'Alto';
  if (score >= 3) return 'Medio';
  return 'Basso';
}

// ── Profile Card ──────────────────────────────────────────────────────────

interface ProfileCardProps {
  profile: Profile;
  onContact: (p: Profile) => void;
  onSave: (p: Profile) => void;
  saving: boolean;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onContact, onSave, saving }) => {
  const age = calcAge(profile.dob);
  const tags = (profile.interests || []).slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      {/* Avatar + nome */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-[#F0813C]">{initials(profile)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">{displayName(profile)}</p>
          <p className="text-xs text-gray-400 truncate">{profile.email}</p>
        </div>
      </div>

      {/* Età + Città */}
      {(age !== null || profile.citta) && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
          {age !== null && <span>{age} anni</span>}
          {age !== null && profile.citta && <span>•</span>}
          {profile.citta && (
            <span className="flex items-center gap-0.5 min-w-0">
              <MapPin size={10} className="shrink-0" />
              <span className="truncate">{profile.citta}</span>
            </span>
          )}
        </div>
      )}

      {/* Scuola */}
      {profile.school && (
        <div className="text-xs text-gray-500 min-w-0">
          <span className="truncate">{profile.school}</span>
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{profile.bio}</p>
      )}

      {/* Tag interessi */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <span key={t}
              className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-full">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Contatori */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Award size={13} className="text-[#F0813C]" />
          {profile.badge_count} badge
        </span>
        <span className="flex items-center gap-1">
          <Briefcase size={13} className="text-[#F0813C]" />
          {profile.event_count} esperienze
        </span>
      </div>

      {/* Azioni */}
      <div className="flex gap-2 mt-auto pt-1">
        {profile.is_contacted ? (
          <button
            disabled
            className="flex-1 py-2.5 rounded-xl bg-orange-300 text-white text-xs font-bold cursor-default flex items-center justify-center gap-1.5">
            <CheckCircle2 size={14} /> Contattato
          </button>
        ) : (
          <button
            onClick={() => onContact(profile)}
            className="flex-1 py-2.5 rounded-xl bg-[#F0813C] hover:bg-orange-500 text-white text-xs font-bold transition-colors">
            Contatta
          </button>
        )}
        {profile.is_saved ? (
          <button
            disabled
            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400 text-xs font-semibold cursor-default flex items-center justify-center gap-1.5">
            <CheckCircle2 size={14} /> Salvato
          </button>
        ) : (
          <button
            onClick={() => onSave(profile)}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:border-orange-300 hover:text-orange-500 text-gray-700 text-xs font-semibold transition-colors disabled:opacity-60">
            {saving ? '...' : 'Salva'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Profile Card Skeleton ─────────────────────────────────────────────────

export const ProfileCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
    <div className="h-3 bg-gray-100 rounded w-1/3" />
    <div className="flex gap-1.5">
      <div className="h-5 bg-gray-100 rounded-full w-16" />
      <div className="h-5 bg-gray-100 rounded-full w-20" />
    </div>
    <div className="flex gap-4">
      <div className="h-3 bg-gray-100 rounded w-16" />
      <div className="h-3 bg-gray-100 rounded w-20" />
    </div>
    <div className="flex gap-2 pt-1">
      <div className="flex-1 h-9 bg-gray-100 rounded-xl" />
      <div className="flex-1 h-9 bg-gray-100 rounded-xl" />
    </div>
  </div>
);

// ── Contact Modal ─────────────────────────────────────────────────────────

interface ContactModalProps {
  profile: Profile;
  companyName: string;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
}

export const ContactModal: React.FC<ContactModalProps> = ({ profile, companyName, onClose, onSend }) => {
  const name = displayName(profile);
  const [message, setMessage] = useState(
    `Ciao ${profile.first_name || name}, il tuo profilo ci interessa molto. Siamo ${companyName} e vorremmo conoscerti meglio.`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    await onSend(message.trim());
    setSending(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Contatta</p>
              <h3 className="font-bold font-montserrat text-gray-900 text-lg leading-tight">{name}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Messaggio</p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 resize-none transition-all"
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Lo studente riceverà una notifica in-app con questo messaggio.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Annulla
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#F0813C] text-white text-sm font-bold hover:bg-orange-500 transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                {sending ? 'Invio...' : <><Send size={14} /> Invia</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Filter Dropdown (custom, stesso stile della casella) ──────────────────

interface FilterDropdownProps {
  icon: React.ReactNode;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  widthClass?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({ icon, value, options, onChange, widthClass }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${widthClass ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all flex items-center justify-between gap-2"
      >
        <span className="truncate text-left">{value}</span>
        <ChevronDown size={13} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</span>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border border-gray-100 shadow-lg py-1 max-h-64 overflow-y-auto">
          {options.map(o => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left pl-3 pr-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                o === value ? 'text-orange-600 font-semibold bg-orange-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Check size={12} className={o === value ? 'opacity-100 shrink-0' : 'opacity-0 shrink-0'} />
              <span className="truncate">{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
