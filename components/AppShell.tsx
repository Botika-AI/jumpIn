import React, { useState, useEffect } from 'react';
import { Home, Compass, Calendar, Building2, Briefcase, ChevronLeft, Bell, User, CalendarDays, Star, Users2, X } from 'lucide-react';
import { UserProfile } from '../types';
import { HomeDashboard } from './HomeDashboard';
import { EsperienzePage } from './EsperienzePage';
import { AziendePage } from './AziendePage';
import { JobPage } from './JobPage';
import { ProfileSettingsPage } from './ProfileSettingsPage';
import { IMieiPage } from './IMieiPage';
import { supabase } from '../lib/supabase';

interface Notifica {
  id: string;
  tipo: string;
  titolo: string;
  corpo: string | null;
  riferimento_id: string | null;
  created_at: string;
}

export type AppSection = 'home' | 'esperienze' | 'eventi' | 'aziende' | 'job';

const NAV_TABS = [
  { key: 'home'       as AppSection, label: 'Dashboard',  Icon: Home      },
  { key: 'esperienze' as AppSection, label: 'Esperienze', Icon: Compass   },
  { key: 'eventi'     as AppSection, label: 'Miei eventi', Icon: Calendar  },
  { key: 'aziende'    as AppSection, label: 'Aziende',    Icon: Building2 },
  { key: 'job'        as AppSection, label: 'Job',        Icon: Briefcase },
];

const ComingSoon: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2 text-center px-6">
    <p className="text-xl font-bold font-montserrat text-gray-700">{title}</p>
    <p className="text-sm text-gray-400">Sezione in arrivo</p>
  </div>
);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'adesso';
  if (mins  < 60) return `${mins} min fa`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
  if (days  === 1) return '1 giorno fa';
  return `${days} giorni fa`;
}

function NotificaIcon({ tipo }: { tipo: string }) {
  if (tipo === 'evento')      return <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0"><CalendarDays size={17} className="text-orange-500" /></div>;
  if (tipo === 'badge')       return <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0"><Star size={17} className="text-yellow-500" /></div>;
  if (tipo === 'connessione') return <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0"><Users2 size={17} className="text-purple-500" /></div>;
  return <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Bell size={17} className="text-blue-500" /></div>;
}

interface Props {
  user: UserProfile;
  onLogout: () => void;
  onUserUpdate?: (updates: Partial<UserProfile>) => void;
}

export const AppShell: React.FC<Props> = ({ user, onLogout, onUserUpdate }) => {
  const [activeSection, setActiveSection]   = useState<AppSection>('home');
  const [showTu, setShowTu]                 = useState(false);
  const [showNotifiche, setShowNotifiche]   = useState(false);
  const [isInDetail, setIsInDetail]         = useState(false);
  const [jobCompanyFilter, setJobCompanyFilter] = useState<{ id: string; name: string } | undefined>(undefined);
  const [notifiche, setNotifiche]           = useState<Notifica[]>([]);
  const [letteIds, setLetteIds]             = useState<Set<string>>(new Set());
  const [tabNotif, setTabNotif]             = useState<'tutte' | 'non_lette'>('tutte');

  const storageKey        = `notif_lette_${user.id}`;
  const storageDeletedKey = `notif_deleted_${user.id}`;

  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(storageDeletedKey);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setLetteIds(new Set(JSON.parse(saved)));

    supabase.from('notifiche').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => {
        const deleted = new Set<string>(JSON.parse(localStorage.getItem(storageDeletedKey) ?? '[]'));
        setNotifiche(((data ?? []) as Notifica[]).filter(n => !deleted.has(n.id)));
      });
  }, []);

  const markLetta = (id: string) => {
    setLetteIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  const deleteNotifica = (id: string) => {
    setNotifiche(prev => prev.filter(n => n.id !== id));
    setLetteIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    setDeletedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(storageDeletedKey, JSON.stringify([...next]));
      return next;
    });
  };

  const deleteAll = () => {
    const ids = visibili.map(n => n.id);
    setNotifiche(prev => prev.filter(n => !ids.includes(n.id)));
    setDeletedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      localStorage.setItem(storageDeletedKey, JSON.stringify([...next]));
      return next;
    });
  };

  const nonLetteCount = notifiche.filter(n => !letteIds.has(n.id)).length;

  const visibili = tabNotif === 'non_lette'
    ? notifiche.filter(n => !letteIds.has(n.id))
    : notifiche;

  const navigate = (section: string) => {
    if (section === 'profilo') { setShowTu(true); return; }
    setActiveSection(section as AppSection);
  };

  const handleOpenJobsForCompany = (companyId: string, companyName: string) => {
    setJobCompanyFilter({ id: companyId, name: companyName });
    setActiveSection('job');
  };

  const [pendingCompanyId, setPendingCompanyId] = useState<string | undefined>(undefined);
  const [pendingEventId, setPendingEventId]       = useState<string | undefined>(undefined);
  const [profileInitialTab, setProfileInitialTab] = useState<'account' | 'attivita'>('account');
  const returnToProfileRef = React.useRef(false);

  const handleOpenCompany = (companyId: string) => {
    setPendingCompanyId(companyId);
    setActiveSection('aziende');
  };

  const handleOpenEvent = (eventId: string) => {
    setPendingEventId(eventId);
    setActiveSection('esperienze');
  };

  const handleBackFromEvent = () => {
    setPendingEventId(undefined);
    if (returnToProfileRef.current) {
      returnToProfileRef.current = false;
      setActiveSection('home');
      setShowTu(true);
    } else {
      setActiveSection('home');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-10">
      {/* Icone fisse top-right */}
      <div
        className={`fixed left-0 right-0 z-30 pointer-events-none transition-opacity duration-200 ${isInDetail ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <div className="max-w-md mx-auto pl-4 pr-2 flex justify-end">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={() => setShowNotifiche(true)} className="relative w-8 h-8 flex items-center justify-center text-orange-500 active:opacity-50 transition-opacity">
              <Bell size={22} strokeWidth={1.75} />
              {nonLetteCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                  {nonLetteCount > 9 ? '9+' : nonLetteCount}
                </span>
              )}
            </button>
            <button onClick={() => setShowTu(true)} className="w-8 h-8 flex items-center justify-center text-orange-500 active:opacity-50 transition-opacity">
              <User size={22} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '64px' }}>
        {activeSection === 'home'       && <HomeDashboard user={user} onNavigate={navigate} onOpenEvent={handleOpenEvent} />}
        {activeSection === 'esperienze' && <EsperienzePage onDetailChange={setIsInDetail} initialEventId={pendingEventId} onBackFromInitial={handleBackFromEvent} />}
        {activeSection === 'eventi'     && <IMieiPage user={user} onNavigate={navigate} onDetailChange={setIsInDetail} />}
        {activeSection === 'aziende'    && <AziendePage onDetailChange={setIsInDetail} onOpenJobsForCompany={handleOpenJobsForCompany} initialCompanyId={pendingCompanyId} />}
        {activeSection === 'job'        && <JobPage onDetailChange={setIsInDetail} initialCompanyFilter={jobCompanyFilter} onOpenCompany={handleOpenCompany} />}
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
              <button key={key} onClick={() => setActiveSection(key)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${active ? 'text-orange-500' : 'text-gray-400'}`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pannello profilo */}
      {showTu && (
        <ProfileSettingsPage
          user={user}
          onBack={() => { setShowTu(false); setProfileInitialTab('account'); }}
          onLogout={onLogout}
          onUserUpdate={onUserUpdate}
          initialTab={profileInitialTab}
          onOpenEvent={(id) => {
            returnToProfileRef.current = true;
            setProfileInitialTab('attivita');
            setShowTu(false);
            handleOpenEvent(id);
          }}
        />
      )}

      {/* Pannello Notifiche */}
      {showNotifiche && (
        <div className="fixed inset-0 bg-[#f2f2f7] z-40 flex flex-col animate-in slide-in-from-right duration-300">

          {/* Header */}
          <div
            className="bg-[#f2f2f7] shrink-0 px-4"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-1">
                <button onClick={() => setShowNotifiche(false)} className="-ml-2 p-1.5 text-gray-500 hover:text-gray-700 transition-colors">
                  <ChevronLeft size={22} />
                </button>
                <h1 className="text-2xl font-bold font-montserrat text-gray-900">Notifiche</h1>
              </div>
              {visibili.length > 0 && (
                <button onClick={deleteAll} className="text-red-400 text-xs font-semibold mt-2 active:opacity-60 transition-opacity">
                  Cancella tutte
                </button>
              )}
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-3 mb-4">
              {(['tutte', 'non_lette'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTabNotif(t)}
                  className={`px-3.5 py-1 rounded-full text-sm font-semibold transition-all ${
                    tabNotif === t
                      ? 'border-2 border-orange-500 text-orange-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {t === 'tutte' ? 'Tutte' : 'Non lette'}
                    {t === 'non_lette' && nonLetteCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
            {visibili.length === 0 ? (
              <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <Bell size={24} className="text-gray-300" />
                </div>
                <p className="font-bold font-montserrat text-gray-700">
                  {tabNotif === 'non_lette' ? 'Tutto letto!' : 'Nessuna notifica'}
                </p>
                <p className="text-sm text-gray-400">
                  {tabNotif === 'non_lette' ? 'Non hai notifiche da leggere' : 'Le novità appariranno qui'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {visibili.map((n, idx) => {
                  const isLetta = letteIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      className={`w-full px-4 py-4 flex items-start gap-3 active:bg-gray-50 transition-colors ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                      {/* Parte cliccabile per marcare come letta */}
                      <div onClick={() => markLetta(n.id)} className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
                        <NotificaIcon tipo={n.tipo} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className={`text-sm leading-snug ${isLetta ? 'font-medium text-gray-500' : 'font-bold text-gray-900'}`}>
                              {n.titolo}
                            </p>
                            {!isLetta && (
                              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                            )}
                          </div>
                          {n.corpo && (
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{n.corpo}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                      {/* Pulsante elimina */}
                      <button
                        onClick={() => deleteNotifica(n.id)}
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors mt-0.5"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
