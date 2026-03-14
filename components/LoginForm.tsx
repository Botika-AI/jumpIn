'use client';

import { useState } from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';

interface LoginFormProps {
  onLogin: (email: string, password: string, onError: (msg: string) => void) => void;
  isLoading: boolean;
  onNavigateRegister: () => void;
}

export default function LoginForm({ onLogin, isLoading, onNavigateRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password, (msg) => setLoginError(msg));
  };

  return (
    <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-700">
      {/* Branding */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold font-montserrat text-orange-600 mb-3 tracking-tighter drop-shadow-sm">JumpIn</h1>
        <p className="text-orange-900/40 font-bold uppercase tracking-[0.3em] text-[10px]">Digital Experience</p>
      </div>

      {/* Glass card */}
      <div className={`liquid-glass p-8 rounded-[2rem] w-full${loginError ? ' ring-2 ring-red-200/50' : ''}`}>
        <h2 className="text-2xl font-bold font-montserrat mb-8 text-gray-800">Accedi</h2>

        {/* Error banner */}
        {loginError !== null && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50/80 border border-red-100 flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2 duration-300">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-xs font-bold leading-tight">{loginError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (loginError) setLoginError(null);
              }}
            />
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-2xl glass-input placeholder:text-gray-300 text-base"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (loginError) setLoginError(null);
              }}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 rounded-2xl btn-primary-liquid flex items-center justify-center gap-2 group mt-6 disabled:opacity-70 transition-all"
          >
            <span>{isLoading ? 'Attendere...' : 'Continua'}</span>
            {!isLoading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-[1px] bg-orange-100/50"></div>
            <span className="text-[10px] text-orange-200 font-bold uppercase tracking-widest">Registrazione</span>
            <div className="flex-1 h-[1px] bg-orange-100/50"></div>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-gray-500 font-medium">
            Nuovo qui?{' '}
            <button
              type="button"
              onClick={() => onNavigateRegister()}
              className="text-orange-600 font-bold hover:text-orange-700 underline-offset-4 decoration-orange-200/50 hover:underline transition-all"
            >
              Crea un account
            </button>
          </p>
        </form>
      </div>

      {/* TEST credentials hint */}
      <div className="mt-10 text-center">
        <div className="inline-block px-4 py-2 rounded-full bg-white/40 border border-white/60 backdrop-blur-md">
          <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
            TEST: <span className="text-orange-400">demo@example.com</span> / <span className="text-orange-400">password123</span>
          </span>
        </div>
      </div>
    </div>
  );
}
