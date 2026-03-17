'use client';

import { useState } from 'react';
import { Camera, LogOut, CheckCircle, Clock, MapPin, Mail, User, ShieldCheck } from 'lucide-react';
import QrScanner from '@/components/QRScanner';
import type { UserProfile } from '@/types';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onCheckIn: (decodedText: string) => void;
  sheetsError?: string | null;
  onClearSheetsError?: () => void;
}

export default function Dashboard({ user, onLogout, onCheckIn, sheetsError, onClearSheetsError }: DashboardProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [success, setSuccess] = useState(false);

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();

  const handleScan = (decodedText: string) => {
    setShowScanner(false);
    setSuccess(true);
    onCheckIn(decodedText);  // pass decodedText through to AuthController for Sheets payload
    if ('vibrate' in navigator) navigator.vibrate(200);
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-10 animate-in fade-in duration-1000">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center font-bold text-xl text-white shadow-lg rotate-3">
            JI
          </div>
          <div>
            <h1 className="text-2xl font-bold font-montserrat tracking-tight text-gray-800">JumpIn</h1>
            <p className="text-[10px] text-orange-400 font-bold tracking-widest uppercase -mt-1">Dashboard</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="p-3 rounded-2xl bg-white/60 hover:bg-red-50 hover:text-red-500 transition-all text-gray-400 border border-white shadow-sm"
          aria-label="Logout"
        >
          <LogOut size={22} />
        </button>
      </div>

      {/* Profile card */}
      <div className="liquid-glass p-8 rounded-[2rem] w-full mb-10 overflow-visible">
        <div className="flex flex-col items-center text-center -mt-4">
          {/* Initials avatar */}
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-white flex items-center justify-center text-4xl font-bold text-orange-600 shadow-xl backdrop-blur-md relative z-10 overflow-hidden">
              <span className="relative z-20">{initials}</span>
              <div className="absolute inset-0 bg-white/20 blur-xl" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-2xl border-4 border-white z-20 shadow-lg">
              <ShieldCheck size={20} />
            </div>
          </div>

          {/* Name */}
          <h2 className="text-3xl font-bold font-montserrat mb-1 text-gray-900 tracking-tight">
            {user.first_name} {user.last_name}
          </h2>

          {/* Active pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/50 text-orange-600 text-[10px] font-bold uppercase tracking-wider mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Profilo Attivo
          </div>

          {/* Info rows */}
          <div className="w-full space-y-3.5 text-left">
            <div className="flex items-center gap-5 p-4 rounded-3xl bg-white/40 border border-white/60 group transition-all hover:bg-white/60">
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                <User size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold mb-0.5">Studente</p>
                <p className="text-sm font-bold text-gray-800">
                  {user.first_name} {user.last_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5 p-4 rounded-3xl bg-white/40 border border-white/60 group transition-all hover:bg-white/60">
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                <MapPin size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold mb-0.5">Istituto Scolastico</p>
                <p className="text-sm font-bold text-gray-800 leading-tight">{user.school}</p>
              </div>
            </div>

            <div className="flex items-center gap-5 p-4 rounded-3xl bg-white/40 border border-white/60 group transition-all hover:bg-white/60">
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                <Mail size={20} />
              </div>
              <div className="flex-1 truncate">
                <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold mb-0.5">Contatti</p>
                <p className="text-sm font-bold text-gray-800 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action section */}
      <div className="flex flex-col items-center justify-center space-y-6">
        {success ? (
          <div className="flex flex-col items-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-[2.5rem] bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center text-green-500 mb-4 shadow-xl shadow-green-500/10">
              <CheckCircle size={48} />
            </div>
            <p className="text-green-600 font-bold text-xl font-montserrat tracking-tight">Check-in Confermato!</p>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">Sincronizzazione completata</p>
          </div>
        ) : (
          <button
            onClick={() => setShowScanner(true)}
            className="flex flex-col items-center group active:scale-90 transition-all duration-300"
          >
            <div className="w-28 h-28 rounded-[3rem] flex items-center justify-center text-white mb-6 transition-all duration-500 glow-camera-liquid">
              <Camera size={44} />
            </div>
            <p className="font-montserrat font-bold text-lg tracking-tight text-gray-800 group-hover:text-orange-600 transition-colors">
              Effettua Check-in
            </p>
          </button>
        )}

        {/* Non-fatal Sheets sync error — shown after success checkmark fades */}
        {sheetsError && (
          <div className="mt-4 px-5 py-3 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center justify-between gap-3 text-yellow-700 text-xs font-medium">
            <span>{sheetsError}</span>
            <button
              onClick={onClearSheetsError}
              className="text-yellow-500 hover:text-yellow-700 transition-colors text-lg leading-none font-bold"
              aria-label="Chiudi"
            >
              ×
            </button>
          </div>
        )}

        {/* Last check-in timestamp */}
        {user.last_checkin && !success && (
          <div className="mt-6 px-6 py-3 rounded-2xl bg-white/30 border border-white/50 backdrop-blur-sm flex items-center gap-2.5 text-gray-400 text-[11px] font-bold uppercase tracking-widest">
            <Clock size={16} className="text-orange-300" />
            <span>
              Ultimo:{' '}
              {new Date(user.last_checkin).toLocaleString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>
        )}
      </div>

      {/* QR Scanner overlay */}
      {showScanner && <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}
