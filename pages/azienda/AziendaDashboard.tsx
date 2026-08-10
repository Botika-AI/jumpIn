import React, { useState, useEffect, useCallback } from 'react';
import { Users, Heart, TrendingUp, TrendingDown, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile, displayName, ProfileCard, ProfileCardSkeleton, ContactModal } from './ProfileCard';

// ── Types ─────────────────────────────────────────────────────────────────

interface AziendaSession {
  id: string;
  name: string;
  email_account: string;
  logo_url: string | null;
  referente: string;
}

interface Stats {
  saved_now: number;
  saved_delta: number;
  interested_total: number;
  interested_week: number;
  contacted_total: number;
  contacted_week: number;
}

// ── Stat Card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  subtext: React.ReactNode;
  loading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, subtext, loading }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-1 min-w-0">
    {loading ? (
      <div className="animate-pulse space-y-3">
        <div className="h-3.5 bg-gray-100 rounded w-2/3" />
        <div className="h-8 bg-gray-100 rounded w-1/3 mt-1" />
        <div className="h-3 bg-gray-100 rounded w-1/2 mt-1" />
      </div>
    ) : (
      <>
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm font-semibold text-gray-500">{title}</p>
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>
        <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
        <div className="text-xs">{subtext}</div>
      </>
    )}
  </div>
);

const DeltaSubtext: React.FC<{ delta: number }> = ({ delta }) => {
  if (delta > 0) return (
    <span className="flex items-center gap-1 text-green-600 font-semibold">
      <TrendingUp size={12} /> +{delta} vs mese scorso
    </span>
  );
  if (delta < 0) return (
    <span className="flex items-center gap-1 text-red-500 font-semibold">
      <TrendingDown size={12} /> {delta} vs mese scorso
    </span>
  );
  return <span className="text-gray-400 font-medium">— invariato vs mese scorso</span>;
};

// ── Main Dashboard ────────────────────────────────────────────────────────

export const AziendaDashboard: React.FC<{ session: AziendaSession }> = ({ session }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [contactTarget, setContactTarget] = useState<Profile | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const { data, error } = await supabase.rpc('get_company_dashboard_stats', {
      p_company_id: session.id,
    });
    if (error) console.error('get_company_dashboard_stats error:', error);
    else if (data) setStats(data as Stats);
    setStatsLoading(false);
  }, [session.id]);

  const fetchProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    const { data, error } = await supabase.rpc('get_suggested_profiles', {
      p_company_id: session.id,
      p_limit: 6,
    });
    if (error) {
      console.error('get_suggested_profiles error:', error);
      setProfilesError(error.message);
    } else if (data) {
      setProfiles(data as Profile[]);
    }
    setProfilesLoading(false);
  }, [session.id]);

  useEffect(() => {
    fetchStats();
    fetchProfiles();
  }, [fetchStats, fetchProfiles]);

  const handleSave = async (profile: Profile) => {
    if (savingId) return;
    setSavingId(profile.id);
    const { data, error } = await supabase.rpc('toggle_save_profile', {
      p_company_id: session.id,
      p_student_id: profile.id,
    });
    if (error) {
      console.error('toggle_save_profile error:', error);
      showToast(`Errore nel salvataggio: ${error.message}`);
    } else if (data === true) {
      setProfiles(prev => prev.filter(p => p.id !== profile.id));
      setStats(prev => prev ? { ...prev, saved_now: prev.saved_now + 1 } : prev);
      showToast(`${displayName(profile)} salvato nei profili`);
    }
    setSavingId(null);
  };

  const handleContact = async (message: string) => {
    if (!contactTarget) return;
    const { error } = await supabase.rpc('contact_student', {
      p_company_id:   session.id,
      p_company_name: session.name,
      p_student_id:   contactTarget.id,
      p_message:      message,
    });
    if (error) {
      console.error('contact_student error:', error);
      showToast(`Errore nell'invio: ${error.message}`);
      return;
    }
    setProfiles(prev => prev.filter(p => p.id !== contactTarget.id));
    setStats(prev => prev ? {
      ...prev,
      contacted_total: prev.contacted_total + 1,
      contacted_week:  prev.contacted_week + 1,
    } : prev);
    showToast(`Messaggio inviato a ${contactTarget.first_name || 'lo studente'}`);
    setContactTarget(null);
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Dashboard Azienda</h1>
        <p className="text-sm text-gray-400 mt-0.5">Benvenuto, {session.name}</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold animate-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      {/* Stat cards */}
      <div className="flex gap-4">
        <StatCard
          title="Profili salvati"
          value={stats?.saved_now ?? 0}
          icon={<Users size={18} className="text-[#F0813C]" />}
          subtext={
            stats
              ? <DeltaSubtext delta={stats.saved_delta} />
              : <span className="text-gray-300">—</span>
          }
          loading={statsLoading}
        />
        <StatCard
          title="Studenti interessati"
          value={stats?.interested_total ?? 0}
          icon={<Heart size={18} className="text-[#F0813C]" />}
          subtext={
            <span className="text-gray-400 font-medium">
              +{stats?.interested_week ?? 0} questa settimana
            </span>
          }
          loading={statsLoading}
        />
        <StatCard
          title="Profili contattati"
          value={stats?.contacted_total ?? 0}
          icon={<Send size={18} className="text-[#F0813C]" />}
          subtext={
            <span className="text-gray-400 font-medium">
              +{stats?.contacted_week ?? 0} questa settimana
            </span>
          }
          loading={statsLoading}
        />
      </div>

      {/* Profili suggeriti */}
      <div>
        <h2 className="text-lg font-bold font-montserrat text-[#1F2430] mb-4">Profili suggeriti</h2>

        {profilesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
          </div>
        ) : profilesError ? (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-red-300" />
            </div>
            <p className="font-bold text-gray-700 text-sm mb-1">Errore nel caricamento dei profili</p>
            <p className="text-xs text-red-500 max-w-sm mx-auto leading-relaxed font-mono break-all">
              {profilesError}
            </p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mt-2">
              Assicurati di aver eseguito <strong>company_contacts_table.sql</strong> nel SQL Editor di Supabase.
            </p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-gray-300" />
            </div>
            <p className="font-bold text-gray-700 text-sm mb-1">Nessun profilo suggerito al momento</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
              I profili appariranno qui man mano che gli studenti si iscrivono alla piattaforma.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map(p => (
              <ProfileCard
                key={p.id}
                profile={p}
                onContact={setContactTarget}
                onSave={handleSave}
                saving={savingId === p.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {contactTarget && (
        <ContactModal
          profile={contactTarget}
          companyName={session.name}
          onClose={() => setContactTarget(null)}
          onSend={handleContact}
        />
      )}
    </div>
  );
};
