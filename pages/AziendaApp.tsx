import React, { useState } from 'react';
import {
  Building2, LogOut, LayoutDashboard, Briefcase,
  FileText, Settings, Menu, AlertCircle, GraduationCap, CalendarDays,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AziendaDashboard } from './azienda/AziendaDashboard';
import { TalentiDiDomani } from './azienda/TalentiDiDomani';
import { EsperienzeAzienda } from './azienda/EsperienzeAzienda';

interface AziendaSession {
  id: string;
  name: string;
  email_account: string;
  logo_url: string | null;
  referente: string;
}

const SESSION_KEY = 'jumpin_azienda_session';

// ── Login ─────────────────────────────────────────────────────────────────

const AziendaLogin: React.FC<{ onLogin: (s: AziendaSession) => void }> = ({ onLogin }) => {
  const [form, setForm] = useState({ nomeAzienda: '', referente: '', email: '', password: '' });
  const [privacy, setPrivacy] = useState(false);
  const [gdpr, setGdpr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inp =
    'w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all bg-white';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacy || !gdpr) {
      setError('Devi accettare la Privacy Policy e il GDPR per continuare.');
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: rpcErr } = await supabase.rpc('verify_azienda_login', {
      p_email:    form.email.trim(),
      p_password: form.password,
      p_name:     form.nomeAzienda.trim(),
    });

    if (rpcErr || !data || (data as unknown[]).length === 0) {
      setError('Credenziali non valide. Verifica nome azienda, email e password.');
      setLoading(false);
      return;
    }

    const az = (data as { id: string; name: string; email_account: string; logo_url: string | null; referente: string | null }[])[0];

    // Usa il referente già salvato nel DB se presente; altrimenti salva quello inserito ora
    const referente = az.referente ?? form.referente.trim();
    if (!az.referente && form.referente.trim()) {
      await supabase.rpc('update_azienda_referente', {
        p_id:        az.id,
        p_referente: form.referente.trim(),
        p_email:     form.email.trim(),
        p_password:  form.password,
      });
    }

    const session: AziendaSession = {
      id:            az.id,
      name:          az.name,
      email_account: az.email_account,
      logo_url:      az.logo_url,
      referente,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setLoading(false);
    onLogin(session);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="text-center mb-10">
        <img src="/logo.png" alt="JumpIn" className="h-20 w-auto mx-auto" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-xs font-semibold leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">Nome Azienda</label>
            <input
              type="text" required className={inp}
              value={form.nomeAzienda}
              onChange={e => { setForm({ ...form, nomeAzienda: e.target.value }); setError(null); }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">Referente</label>
            <input
              type="text" className={inp} placeholder="Nome Cognome"
              value={form.referente}
              onChange={e => setForm({ ...form, referente: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">Email aziendale</label>
            <input
              type="email" required className={inp} placeholder="nome@azienda.com"
              value={form.email}
              onChange={e => { setForm({ ...form, email: e.target.value }); setError(null); }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">Password</label>
            <input
              type="password" required className={inp} placeholder="••••••••"
              value={form.password}
              onChange={e => { setForm({ ...form, password: e.target.value }); setError(null); }}
            />
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox" checked={privacy}
                onChange={e => setPrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-orange-500 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Accetto la{' '}
                <button type="button"
                  onClick={() => window.open('https://www.fattorcomune.com/privacy-policy/', '_blank')}
                  className="text-orange-500 font-semibold hover:underline underline-offset-2">
                  Privacy Policy
                </button>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox" checked={gdpr}
                onChange={e => setGdpr(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-orange-500 shrink-0 cursor-pointer"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Ho preso visione di{' '}
                <button type="button"
                  onClick={() => window.open('https://gdpr-info.eu/', '_blank')}
                  className="text-orange-500 font-semibold hover:underline underline-offset-2">
                  GDPR...
                </button>
              </span>
            </label>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#F0813C] hover:bg-orange-500 text-white font-bold text-sm transition-colors disabled:opacity-70 mt-2">
            {loading ? 'Accesso in corso...' : 'Crea account'}
          </button>

          <p className="text-center text-sm text-gray-500 pt-1">
            <a href="/" className="text-gray-500 hover:text-orange-500 transition-colors font-medium">
              Torna al login
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

// ── Portale ───────────────────────────────────────────────────────────────

type PortalSection = 'dashboard' | 'talenti' | 'esperienze' | 'jobpost' | 'candidature' | 'impostazioni';

const PORTAL_NAV: { key: PortalSection; label: string; Icon: React.ElementType }[] = [
  { key: 'dashboard',    label: 'Dashboard',        Icon: LayoutDashboard },
  { key: 'talenti',      label: 'Talenti di Domani', Icon: GraduationCap  },
  { key: 'esperienze',   label: 'Esperienze',       Icon: CalendarDays    },
  { key: 'jobpost',      label: 'Job Post',         Icon: Briefcase       },
  { key: 'candidature',  label: 'Candidature',      Icon: FileText        },
  { key: 'impostazioni', label: 'Impostazioni',     Icon: Settings        },
];

const PlaceholderPortal: React.FC<{ label: string; Icon: React.ElementType }> = ({ label, Icon }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
      <Icon size={24} className="text-gray-400" />
    </div>
    <p className="font-bold font-montserrat text-gray-700">{label}</p>
    <p className="text-sm text-gray-400">Sezione in costruzione</p>
  </div>
);

const AziendaPortal: React.FC<{ session: AziendaSession; onLogout: () => void }> = ({ session, onLogout }) => {
  const [activeSection, setActiveSection] = useState<PortalSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeNav = PORTAL_NAV.find(n => n.key === activeSection)!;

  return (
    <div className="fixed inset-0 flex bg-gray-50">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-60 bg-white border-r border-gray-100 flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Azienda header */}
        <div className="px-5 py-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
              {session.logo_url
                ? <img src={session.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                : <Building2 size={22} className="text-gray-400" />
              }
            </div>
            <div className="min-w-0">
              <p className="font-bold font-montserrat text-gray-900 text-sm leading-tight truncate">{session.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Portale Azienda</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {PORTAL_NAV.map(({ key, label, Icon }) => {
            const active = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => { setActiveSection(key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors ${
                  active
                    ? 'bg-orange-50 text-orange-500 font-bold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium'
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 1.75} className="shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Utente */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Building2 size={15} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate font-montserrat">
                {session.referente || session.name}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{session.email_account}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0"
              title="Esci"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenuto */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-gray-500">
            <Menu size={20} />
          </button>
          <p className="font-bold font-montserrat text-gray-900 text-sm">{activeNav.label}</p>
        </div>

        <main className={`flex-1 p-6 md:p-8 bg-[#F5F6F8] ${activeSection === 'talenti' || activeSection === 'esperienze' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {activeSection === 'dashboard' && <AziendaDashboard session={session} />}
          {activeSection === 'talenti' && <TalentiDiDomani session={session} />}
          {activeSection === 'esperienze' && <EsperienzeAzienda session={session} />}
          {activeSection !== 'dashboard' && activeSection !== 'talenti' && activeSection !== 'esperienze' && (
            <PlaceholderPortal label={activeNav.label} Icon={activeNav.Icon} />
          )}
        </main>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────

export const AziendaApp: React.FC = () => {
  const [session, setSession] = useState<AziendaSession | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (session) {
    return <AziendaPortal session={session} onLogout={handleLogout} />;
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 sm:p-4 bg-gray-50">
      <AziendaLogin onLogin={setSession} />
    </div>
  );
};
