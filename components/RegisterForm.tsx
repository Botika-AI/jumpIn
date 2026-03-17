'use client';

import { useState } from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { RIMINI_SCHOOLS } from '@/lib/schools';
import type { UserProfile } from '@/types';

interface RegisterFormProps {
  onRegister: (profile: Omit<UserProfile, 'id' | 'last_checkin'>, password: string) => void;
  isLoading: boolean;
  onNavigateLogin: () => void;
  registerError?: string | null;
  onClearRegisterError?: () => void;
}

export default function RegisterForm({ onRegister, isLoading, onNavigateLogin, registerError, onClearRegisterError }: RegisterFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState(RIMINI_SCHOOLS[0].value);
  const [customSchool, setCustomSchool] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordError('Le password non coincidono.');
      return;
    }
    setPasswordError(null);
    onRegister({
      first_name: firstName,
      last_name: lastName,
      email,
      school: school === 'altro' ? customSchool : school,
      dob,
    }, password);
  };

  return (
    <div className="w-full max-w-md animate-in slide-in-from-right-8 duration-700 py-10">
      {/* Branding */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold font-montserrat text-orange-600 tracking-tighter drop-shadow-sm">Nuovo Account</h1>
        <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1">Benvenuto in JumpIn</p>
      </div>

      {/* Glass card */}
      <div className="liquid-glass p-8 rounded-[2rem] w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome + Cognome grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Nome</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Cognome</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Scuola dropdown */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Scuola</label>
            <div className="relative">
              <select
                className="w-full px-4 py-3 rounded-2xl glass-input text-sm appearance-none cursor-pointer"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
              >
                {RIMINI_SCHOOLS.map(s => (
                  <option key={s.value} value={s.value} className="bg-white">{s.label}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-orange-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>

          {/* Conditional "Altro" custom school input */}
          {school === 'altro' && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Specifica Scuola</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
                value={customSchool}
                onChange={(e) => setCustomSchool(e.target.value)}
              />
            </div>
          )}

          {/* Data di Nascita */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Data di Nascita</label>
            <input
              type="date"
              required
              className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (registerError) onClearRegisterError?.(); }}
            />
          </div>

          {/* Conferma Password */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Conferma Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-2xl glass-input text-sm"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
            />
          </div>

          {passwordError && (
            <div className="p-3 rounded-2xl bg-red-50/80 border border-red-100 flex items-center gap-2 text-red-600">
              <AlertCircle size={16} className="shrink-0" />
              <p className="text-xs font-bold">{passwordError}</p>
            </div>
          )}

          {registerError && (
            <div className="p-3 rounded-2xl bg-red-50/80 border border-red-100 flex items-center gap-2 text-red-600">
              <AlertCircle size={16} className="shrink-0" />
              <p className="text-xs font-bold">{registerError}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 rounded-2xl btn-primary-liquid font-bold mt-6 disabled:opacity-70 transition-all"
          >
            {isLoading ? 'Registrazione...' : 'Registrati ora'}
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 font-medium pt-4">
            Hai un account?{' '}
            <button
              type="button"
              onClick={() => onNavigateLogin()}
              className="text-orange-600 font-bold hover:underline"
            >
              Effettua l&apos;accesso
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
