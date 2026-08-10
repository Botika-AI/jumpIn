import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Building2, Calendar, Briefcase,
  Award, FileText, Settings, LogOut, Menu,
} from 'lucide-react';
import { UserProfile } from '../types';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminStudenti } from './admin/AdminStudenti';
import { AdminAziende } from './admin/AdminAziende';
import { AdminEventi } from './admin/AdminEventi';
import { AdminJobPost } from './admin/AdminJobPost';
import { AdminBadge } from './admin/AdminBadge';
import { AdminCandidature } from './admin/AdminCandidature';

type AdminSection =
  | 'dashboard' | 'studenti' | 'aziende' | 'eventi'
  | 'jobpost' | 'badge' | 'candidature' | 'homepage';

const ADMIN_NAV: { key: AdminSection; label: string; Icon: React.ElementType }[] = [
  { key: 'dashboard',   label: 'Dashboard Generale', Icon: LayoutDashboard },
  { key: 'studenti',    label: 'Utenti',             Icon: Users            },
  { key: 'aziende',     label: 'Aziende',            Icon: Building2        },
  { key: 'eventi',      label: 'Eventi',             Icon: Calendar         },
  { key: 'jobpost',     label: 'Job Post',           Icon: Briefcase        },
  { key: 'badge',       label: 'Badge e Attestati',  Icon: Award            },
  { key: 'candidature', label: 'Candidature',        Icon: FileText         },
  { key: 'homepage',    label: 'Gestione Homepage',  Icon: Settings         },
];

interface Props {
  user: UserProfile;
  onLogout: () => void;
}

const PlaceholderSection: React.FC<{ label: string; Icon: React.ElementType }> = ({ label, Icon }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
      <Icon size={24} className="text-gray-400" />
    </div>
    <p className="font-bold font-montserrat text-gray-700">{label}</p>
    <p className="text-sm text-gray-400">Sezione in costruzione</p>
  </div>
);

export const AdminShell: React.FC<Props> = ({ user, onLogout }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || 'A';
  const activeNav = ADMIN_NAV.find(n => n.key === activeSection)!;

  return (
    <div className="fixed inset-0 flex bg-gray-50">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-60 bg-white border-r border-gray-100 flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
        <div className="px-5 py-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.png" alt="JumpIn" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <p className="font-bold font-montserrat text-gray-900 text-sm leading-tight">JumpIn</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {ADMIN_NAV.map(({ key, label, Icon }) => {
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

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <span className="text-gray-600 font-bold text-xs">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate font-montserrat">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
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

      {/* ── Contenuto principale ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar mobile */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-gray-500">
            <Menu size={20} />
          </button>
          <p className="font-bold font-montserrat text-gray-900 text-sm">{activeNav.label}</p>
        </div>


        {/* Area contenuto */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F5F6F8]">
          {activeSection === 'dashboard' && <AdminDashboard />}
          {activeSection === 'studenti'  && <AdminStudenti />}
          {activeSection === 'aziende'   && <AdminAziende />}
          {activeSection === 'eventi'    && <AdminEventi />}
          {activeSection === 'jobpost'   && <AdminJobPost />}
          {activeSection === 'badge'        && <AdminBadge />}
          {activeSection === 'candidature'  && <AdminCandidature />}
          {activeSection !== 'dashboard' && activeSection !== 'studenti' && activeSection !== 'aziende' && activeSection !== 'eventi' && activeSection !== 'jobpost' && activeSection !== 'badge' && activeSection !== 'candidature' && (
            <PlaceholderSection label={activeNav.label} Icon={activeNav.Icon} />
          )}
        </main>
      </div>
    </div>
  );
};
