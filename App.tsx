import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthState, UserProfile } from './types';
import { supabase } from './lib/supabase';
import { RIMINI_SCHOOLS } from './constants';
import { GlassCard } from './components/GlassCard';
import { Dashboard } from './components/Dashboard';
import AdminPage from './pages/AdminPage';
import { AlertCircle, ChevronRight } from 'lucide-react';

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

  const loadProfile = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (profile) {
      setUser(profile as UserProfile);
      setAuthState('dashboard');
    } else {
      setAuthState('login');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setAuthState('login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthState('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

    await loadProfile(data.user.id);
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
    });

    if (error || !data.user) {
      setLoginError(error?.message || 'Errore durante la registrazione.');
      setIsLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      school,
      dob: formData.dob,
    });

    if (profileError) {
      setLoginError('Profilo non salvato. Riprova.');
      setIsLoading(false);
      return;
    }

    await loadProfile(data.user.id);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthState('login');
    setFormData({ ...formData, email: '', password: '' });
    setLoginError(null);
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  if (authState === 'dashboard' && user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  if (authState === 'register') {
    return (
      <div className="w-full max-w-md mx-auto animate-in slide-in-from-right-8 duration-700 py-10 px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold font-montserrat text-orange-600 tracking-tighter drop-shadow-sm">Nuovo Account</h1>
          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1">Benvenuto in JumpIn</p>
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
                className="text-orange-600 font-bold hover:underline">Effettua l'accesso</button>
            </p>
          </form>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-in slide-in-from-bottom-8 duration-700 px-4">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold font-montserrat text-orange-600 mb-3 tracking-tighter drop-shadow-sm">JumpIn</h1>
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
              className="text-orange-600 font-bold hover:text-orange-700 underline-offset-4 decoration-orange-200/50 hover:underline transition-all">
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-4">
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<AuthApp />} />
      </Routes>
    </div>
  </BrowserRouter>
);

export default App;
