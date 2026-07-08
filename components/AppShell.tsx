import React, { useState } from 'react';
import { Home, Compass, Calendar, Building2, Briefcase, ChevronLeft, Bell, User } from 'lucide-react';
import { UserProfile } from '../types';
import { HomeDashboard } from './HomeDashboard';
import { EsperienzePage } from './EsperienzePage';
import { AziendePage } from './AziendePage';
import { JobPage } from './JobPage';
import { ProfileSettingsPage } from './ProfileSettingsPage';

export type AppSection = 'home' | 'esperienze' | 'eventi' | 'aziende' | 'job';

const NAV_TABS = [
  { key: 'home'       as AppSection, label: 'Dashboard',  Icon: Home      },
  { key: 'esperienze' as AppSection, label: 'Esperienze', Icon: Compass   },
  { key: 'eventi'     as AppSection, label: 'I Miei',     Icon: Calendar  },
  { key: 'aziende'    as AppSection, label: 'Aziende',    Icon: Building2 },
  { key: 'job'        as AppSection, label: 'Job',        Icon: Briefcase },
];

interface Props {
  user: UserProfile;
  onLogout: () => void;
  onUserUpdate?: (updates: Partial<UserProfile>) => void;
}

const ComingSoon: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2 text-center px-6">
    <p className="text-xl font-bold font-montserrat text-gray-700">{title}</p>
    <p className="text-sm text-gray-400">Sezione in arrivo</p>
  </div>
);


export const AppShell: React.FC<Props> = ({ user, onLogout, onUserUpdate }) => {
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [showTu, setShowTu] = useState(false);
  const [showNotifiche, setShowNotifiche] = useState(false);
  const [isInDetail, setIsInDetail] = useState(false);

  const navigate = (section: string) => setActiveSection(section as AppSection);

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-10">
      {/* Icone fisse top-right — nascoste in modalità dettaglio */}
      <div
        className={`fixed left-0 right-0 z-30 pointer-events-none transition-opacity duration-200 ${isInDetail ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <div className="max-w-md mx-auto px-4 flex justify-end">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={() => setShowNotifiche(true)} className="w-8 h-8 flex items-center justify-center text-orange-500 active:opacity-50 transition-opacity">
              <Bell size={22} strokeWidth={1.75} />
            </button>
            <button onClick={() => setShowTu(true)} className="w-8 h-8 flex items-center justify-center text-orange-500 active:opacity-50 transition-opacity">
              <User size={22} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '64px' }}>
        {activeSection === 'home'       && <HomeDashboard user={user} onNavigate={navigate} />}
        {activeSection === 'esperienze' && <EsperienzePage onDetailChange={setIsInDetail} />}
        {activeSection === 'eventi'     && <ComingSoon title="I Miei Eventi" />}
        {activeSection === 'aziende'    && <AziendePage onDetailChange={setIsInDetail} />}
        {activeSection === 'job'        && <JobPage onDetailChange={setIsInDetail} />}
      </div>

      {/* Bottom tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex max-w-md mx-auto">
          {NAV_TABS.map(({ key, label, Icon }) => {
            const active = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                  active ? 'text-orange-500' : 'text-gray-400'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pannello profilo e impostazioni */}
      {showTu && (
        <ProfileSettingsPage
          user={user}
          onBack={() => setShowTu(false)}
          onLogout={onLogout}
          onUserUpdate={onUserUpdate}
        />
      )}

      {/* Pannello Notifiche */}
      {showNotifiche && (
        <div className="fixed inset-0 bg-gray-50 z-40 flex flex-col animate-in slide-in-from-right duration-300">
          <div
            className="bg-white border-b border-gray-100 flex items-center gap-3 px-4 shrink-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: '12px' }}
          >
            <button onClick={() => setShowNotifiche(false)} className="-ml-1 p-1.5 text-gray-500 hover:text-gray-700 transition-colors">
              <ChevronLeft size={22} />
            </button>
            <p className="font-bold font-montserrat text-gray-900">Notifiche</p>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <ComingSoon title="Notifiche" />
          </div>
        </div>
      )}
    </div>
  );
};
