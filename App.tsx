import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthState, UserProfile } from './types';
import { supabase } from './lib/supabase';
import { RIMINI_SCHOOLS } from './constants';
import { GlassCard } from './components/GlassCard';
import { AppShell } from './components/AppShell';
import { AdminShell } from './pages/AdminShell';
import { AziendaApp } from './pages/AziendaApp';
import { OnboardingInterests } from './components/OnboardingInterests';
import { AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';

const AuthApp: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    dob: '',
    school: RIMINI_SCHOOLS[0].value,
    customSchool: '',
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState(false);

  const loadProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (profile) {
      setUser(profile as UserProfile);
      setAuthState('dashboard');
      return profile as UserProfile;
    } else {
      setAuthState('login');
      return null;
    }
  };

  useEffect(() => {
    const isRecovery =
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery');

    if (isRecovery) {
      setAuthState('set-password');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthState('set-password');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthState('login');
      }
    });

    if (!isRecovery) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setAuthState('login');
        }
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyAccepted) {
      setPrivacyError(true);
      return;
    }
    setIsLoading(true);
    setLoginError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error || !data.user) {
      setLoginError('Credenziali non valide. Controlla email e password.');
      setIsLoading(false);
      return;
    }

    const profile = await loadProfile(data.user.id);

    supabase.from('access_logs').insert({ user_id: data.user.id, user_type: profile?.is_admin ? 'admin' : 'studente' })
      .then(({ error }) => { if (error) console.error('access_logs insert error:', error); });

    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const school = formData.school === 'altro' ? formData.customSchool : formData.school;

    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          school,
          dob: formData.dob,
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setLoginError('Hai già un account con questa email. Effettua il login.');
      } else {
        setLoginError(error.message || 'Errore durante la registrazione.');
      }
      setIsLoading(false);
      return;
    }

    if (!data.user) {
      setLoginError('Errore durante la registrazione.');
      setIsLoading(false);
      return;
    }

    await supabase.from('profiles').upsert({
      id: data.user.id,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      school,
      dob: formData.dob,
    });

    setUser({
      id: data.user.id,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      school,
      dob: formData.dob,
      is_admin: false,
      last_checkin: null,
    });

    supabase.from('access_logs').insert({ user_id: data.user.id, user_type: 'studente' })
      .then(({ error }) => { if (error) console.error('access_logs register error:', error); });

    setAuthState('onboarding');
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthState('login');
    setFormData({ ...formData, email: '', password: '' });
    setLoginError(null);
  };

  const handleOnboardingComplete = async (interests: string[], goals: string[]) => {
    if (!user) return;
    await supabase.from('profiles').update({ interests, goals }).eq('id', user.id);
    setUser({ ...user, interests, goals });
    setAuthState('dashboard');
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    const { error } = await supabase.auth.updateUser({ password: formData.password });
    setIsLoading(false);
    if (error) {
      setLoginError('Errore durante il salvataggio. Riprova.');
    } else {
      setFormData({ ...formData, password: '' });
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setAuthState('login');
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${window.location.origin}/`,
    });
    setIsLoading(false);
    if (error) {
      setLoginError('Errore nell\'invio dell\'email. Riprova.');
    } else {
      setAuthState('reset-sent' as AuthState);
    }
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  if (authState === 'dashboard' && user) {
    if (user.is_admin) {
      return <AdminShell user={user} onLogout={handleLogout} />;
    }
    return (
      <AppShell
        user={user}
        onLogout={handleLogout}
        onUserUpdate={(updates: Partial<UserProfile>) => setUser((prev: UserProfile | null) => prev ? { ...prev, ...updates } : prev)}
      />
    );
  }

  if (authState === 'onboarding' && user) {
    return <OnboardingInterests onComplete={handleOnboardingComplete} />;
  }

  if (authState === 'register') {
    return (
      <div className="w-full max-w-md mx-auto animate-in slide-in-from-right-8 duration-700 py-10 px-4">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="JumpIn" className="h-20 w-auto mx-auto mb-1" />
          <p className="text-[10px] text-orange-400 font-bold tracking-widest uppercase mt-1">Dashboard</p>
        </div>
        <GlassCard>
          {loginError && (
            <div className="mb-4 p-4 rounded-2xl bg-red-50/80 border border-red-100 flex items-center gap-3 text-red-600">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-xs font-bold leading-tight">{loginError}</p>
            </div>
          )}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nome</label>
                <input type="text" required className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Cognome</label>
                <input type="text" required className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
              <input type="email" required className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Scuola</label>
              <div className="relative">
                <select className="w-full px-4 py-3 rounded-2xl glass-input text-sm appearance-none cursor-pointer"
                  value={formData.school} onChange={(e) => setFormData({ ...formData, school: e.target.value })}>
                  {RIMINI_SCHOOLS.map(s => <option key={s.value} value={s.value} className="bg-white">{s.label}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-orange-400">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>
            {formData.school === 'altro' && (
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Specifica Scuola</label>
                <input type="text" required className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  value={formData.customSchool} onChange={(e) => setFormData({ ...formData, customSchool: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Data di Nascita</label>
              <input type="date" required className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
              <input type="password" required minLength={8} className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-5 rounded-2xl btn-primary-liquid font-bold mt-6 disabled:opacity-70 transition-all">
              {isLoading ? 'Creazione in corso...' : 'Registrati ora'}
            </button>
            <p className="text-center text-sm text-gray-500 font-medium pt-4">
              Hai un account?{' '}
              <button type="button" onClick={() => { setAuthState('login'); setLoginError(null); }}
                className="text-orange-500 font-bold hover:text-orange-600 hover:underline underline-offset-4 transition-all">Effettua l'accesso</button>
            </p>
          </form>
        </GlassCard>
      </div>
    );
  }

  if (authState === 'set-password') {
    return (
      <div className="w-full max-w-md mx-auto animate-in slide-in-from-bottom-8 duration-700 px-4">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="JumpIn" className="h-20 w-auto mx-auto mb-1" />
          <p className="text-orange-900/40 font-bold uppercase tracking-[0.3em] text-[10px]">Digital Experience</p>
        </div>
        <GlassCard>
          <h2 className="text-2xl font-bold font-montserrat mb-2 text-gray-800">Nuova Password</h2>
          <p className="text-sm text-gray-400 mb-8">Scegli una nuova password per il tuo account.</p>
          {loginError && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50/80 border border-red-100 flex items-center gap-3 text-red-600">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-xs font-bold leading-tight">{loginError}</p>
            </div>
          )}
          <form onSubmit={handleSetNewPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nuova Password</label>
              <input type="password" required minLength={8} placeholder="••••••••"
                className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-5 rounded-2xl btn-primary-liquid flex items-center justify-center gap-2 group mt-6 disabled:opacity-70">
              <span>{isLoading ? 'Salvataggio...' : 'Salva nuova password'}</span>
              {!isLoading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </GlassCard>
      </div>
    );
  }

  if (authState === 'reset' || authState === ('reset-sent' as AuthState)) {
    return (
      <div className="w-full max-w-md mx-auto animate-in slide-in-from-bottom-8 duration-700 px-4">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="JumpIn" className="h-20 w-auto mx-auto mb-1" />
          <p className="text-orange-900/40 font-bold uppercase tracking-[0.3em] text-[10px]">Digital Experience</p>
        </div>
        <GlassCard>
          {authState === ('reset-sent' as AuthState) ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <CheckCircle2 size={48} className="text-green-500" />
              <h2 className="text-2xl font-bold font-montserrat text-gray-800">Email inviata!</h2>
              <p className="text-sm text-gray-500">Controlla la tua casella di posta e segui il link per reimpostare la password.</p>
              <button onClick={() => { setAuthState('login'); setLoginError(null); }}
                className="mt-4 text-orange-500 font-bold text-sm hover:text-orange-600 hover:underline underline-offset-4 transition-all">
                Torna al login
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold font-montserrat mb-2 text-gray-800">Reimposta Password</h2>
              <p className="text-sm text-gray-400 mb-8">Inserisci la tua email e ti invieremo un link per reimpostare la password.</p>
              {loginError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50/80 border border-red-100 flex items-center gap-3 text-red-600">
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="text-xs font-bold leading-tight">{loginError}</p>
                </div>
              )}
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                  <input type="email" required placeholder="name@example.com"
                    className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full py-5 rounded-2xl btn-primary-liquid flex items-center justify-center gap-2 group mt-6 disabled:opacity-70">
                  <span>{isLoading ? 'Invio in corso...' : 'Invia link di recupero'}</span>
                  {!isLoading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                </button>
                <p className="text-center text-sm text-gray-500 font-medium pt-2">
                  <button type="button" onClick={() => { setAuthState('login'); setLoginError(null); }}
                    className="text-orange-500 font-bold hover:text-orange-600 hover:underline underline-offset-4 transition-all">
                    Torna al login
                  </button>
                </p>
              </form>
            </>
          )}
        </GlassCard>
      </div>
    );
  }

  // Login
  return (
    <div className="w-full max-w-md mx-auto animate-in slide-in-from-bottom-8 duration-700 px-4">
      <div className="text-center mb-10">
        <img src="/logo.png" alt="JumpIn" className="h-20 w-auto mx-auto mb-1" />
        <p className="text-orange-900/40 font-bold uppercase tracking-[0.3em] text-[10px]">Digital Experience</p>
      </div>
      <GlassCard className={loginError ? 'ring-2 ring-red-200/50' : ''}>
        <h2 className="text-2xl font-bold font-montserrat mb-8 text-gray-800">Accedi</h2>
        {loginError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50/80 border border-red-100 flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2 duration-300">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-xs font-bold leading-tight">{loginError}</p>
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
            <input type="email" required placeholder="name@example.com"
              className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
              value={formData.email}
              onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (loginError) setLoginError(null); }} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <input type="password" required placeholder="••••••••"
              className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
              value={formData.password}
              onChange={(e) => { setFormData({ ...formData, password: e.target.value }); if (loginError) setLoginError(null); }} />
            <p className="text-xs text-gray-500 font-medium mt-1 text-left ml-1">
              Dimenticata?{' '}
              <button type="button" onClick={() => { setAuthState('reset'); setLoginError(null); }}
                className="text-orange-500 font-bold hover:text-orange-600 hover:underline underline-offset-4 transition-all">
                Reimposta Password
              </button>
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-start gap-3 ml-1">
              <input type="checkbox" id="privacy"
                checked={privacyAccepted}
                onChange={(e) => { setPrivacyAccepted(e.target.checked); setPrivacyError(false); }}
                className="mt-0.5 w-4 h-4 accent-orange-500 cursor-pointer shrink-0" />
              <label htmlFor="privacy" className="text-xs text-gray-500 font-medium leading-relaxed cursor-pointer">
                Ho letto e accetto la{' '}
                <button type="button" onClick={() => window.open('https://www.fattorcomune.com/privacy-policy/', '_blank')}
                  className="text-orange-500 font-bold hover:text-orange-600 hover:underline underline-offset-4 transition-all">
                  normativa sulla privacy
                </button>
              </label>
            </div>
            {privacyError && (
              <p className="text-xs text-gray-500 font-medium ml-1 animate-in slide-in-from-top-1 duration-200">
                <span className="text-red-500">*</span> Devi accettare la normativa sulla privacy per continuare.
              </p>
            )}
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-5 rounded-2xl btn-primary-liquid flex items-center justify-center gap-2 group mt-6 disabled:opacity-70">
            <span>{isLoading ? 'Attendi...' : 'Continua'}</span>
            {!isLoading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-[1px] bg-orange-100/50"></div>
            <span className="text-[10px] text-orange-200 font-bold uppercase tracking-widest">Registrazione</span>
            <div className="flex-1 h-[1px] bg-orange-100/50"></div>
          </div>
          <p className="text-center text-sm text-gray-500 font-medium">
            Nuovo qui?{' '}
            <button type="button" onClick={() => setAuthState('register')}
              className="text-orange-500 font-bold hover:text-orange-600 hover:underline underline-offset-4 transition-all">
              Crea un account
            </button>
          </p>
        </form>
      </GlassCard>
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/azienda" element={<AziendaApp />} />
      <Route path="*" element={
        <div className="w-full min-h-screen flex flex-col items-center justify-center p-6 sm:p-4">
          <AuthApp />
        </div>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
