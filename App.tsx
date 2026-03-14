
import React, { useState, useEffect } from 'react';
import { AuthState, UserProfile } from './types';
import { RIMINI_SCHOOLS } from './constants';
import { GlassCard } from './components/GlassCard';
import Dashboard from './components/Dashboard';
import { AlertCircle, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('login');
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

  useEffect(() => {
    const savedUser = localStorage.getItem('jumpin_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setAuthState('dashboard');
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    setTimeout(() => {
      if (formData.email === 'demo@example.com' && formData.password === 'password123') {
        const mockUser: UserProfile = {
          id: 'demo-123',
          first_name: 'Demo',
          last_name: 'User',
          email: 'demo@example.com',
          school: 'JumpIn Testing School',
          dob: '2000-01-01',
          last_checkin: new Date().toISOString()
        };
        setUser(mockUser);
        localStorage.setItem('jumpin_user', JSON.stringify(mockUser));
        setAuthState('dashboard');
      } else {
        setLoginError('Credenziali non valide. Usa demo@example.com / password123');
      }
      setIsLoading(false);
    }, 1200);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      const mockUser: UserProfile = {
        id: Math.random().toString(36).substr(2, 9),
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        school: formData.school === 'altro' ? formData.customSchool : formData.school,
        dob: formData.dob,
        last_checkin: undefined
      };
      
      setUser(mockUser);
      localStorage.setItem('jumpin_user', JSON.stringify(mockUser));
      setAuthState('dashboard');
      setIsLoading(false);
    }, 2000);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('jumpin_user');
    setAuthState('login');
    setFormData({ ...formData, email: '', password: '' });
    setLoginError(null);
  };

  const handleCheckIn = async () => {
    if (user) {
      const timestamp = new Date().toISOString();
      const updatedUser = { ...user, last_checkin: timestamp };
      setUser(updatedUser);
      localStorage.setItem('jumpin_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-4">
      {authState === 'login' && (
        <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-700">
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
                <input 
                  type="email" 
                  required
                  placeholder="name@example.com"
                  className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({...formData, email: e.target.value});
                    if (loginError) setLoginError(null);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({...formData, password: e.target.value});
                    if (loginError) setLoginError(null);
                  }}
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-5 rounded-2xl btn-primary-liquid flex items-center justify-center gap-2 group mt-6 disabled:opacity-70"
              >
                <span>{isLoading ? 'Attendi...' : 'Continua'}</span>
                {!isLoading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
              
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-[1px] bg-orange-100/50"></div>
                <span className="text-[10px] text-orange-200 font-bold uppercase tracking-widest">Registrazione</span>
                <div className="flex-1 h-[1px] bg-orange-100/50"></div>
              </div>
              
              <p className="text-center text-sm text-gray-500 font-medium">
                Nuovo qui? <button type="button" onClick={() => setAuthState('register')} className="text-orange-600 font-bold hover:text-orange-700 underline-offset-4 decoration-orange-200/50 hover:underline transition-all">Crea un account</button>
              </p>
            </form>
          </GlassCard>
          
          <div className="mt-10 text-center">
            <div className="inline-block px-4 py-2 rounded-full bg-white/40 border border-white/60 backdrop-blur-md">
              <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
                TEST: <span className="text-orange-400">demo@example.com</span> / <span className="text-orange-400">password123</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {authState === 'register' && (
        <div className="w-full max-w-md animate-in slide-in-from-right-8 duration-700 py-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold font-montserrat text-orange-600 tracking-tighter drop-shadow-sm">Nuovo Account</h1>
            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1">Benvenuto in JumpIn</p>
          </div>
          <GlassCard>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nome</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Cognome</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Scuola</label>
                <div className="relative">
                  <select 
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm appearance-none cursor-pointer"
                    value={formData.school}
                    onChange={(e) => setFormData({...formData, school: e.target.value})}
                  >
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
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                    value={formData.customSchool}
                    onChange={(e) => setFormData({...formData, customSchool: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Data di Nascita</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  value={formData.dob}
                  onChange={(e) => setFormData({...formData, dob: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                <input 
                  type="password" 
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-5 rounded-2xl btn-primary-liquid font-bold mt-6 disabled:opacity-70 transition-all"
              >
                {isLoading ? 'Creazione in corso...' : 'Registrati ora'}
              </button>

              <p className="text-center text-sm text-gray-500 font-medium pt-4">
                Hai un account? <button type="button" onClick={() => setAuthState('login')} className="text-orange-600 font-bold hover:underline">Effettua l'accesso</button>
              </p>
            </form>
          </GlassCard>
        </div>
      )}

      {authState === 'dashboard' && user && (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onCheckIn={handleCheckIn}
        />
      )}
    </div>
  );
};

export default App;
