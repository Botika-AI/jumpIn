import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  Profile, ActivityLevel, displayName, activityLevel,
  ProfileCard, ProfileCardSkeleton, ContactModal, FilterDropdown,
} from './ProfileCard';

const ALL_LEVELS = 'Tutti i livelli di attività';

// ── Types ─────────────────────────────────────────────────────────────────

interface AziendaSession {
  id: string;
  name: string;
  email_account: string;
  logo_url: string | null;
  referente: string;
}

// ── Main ──────────────────────────────────────────────────────────────────

export const TalentiDiDomani: React.FC<{ session: AziendaSession }> = ({ session }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [contactTarget, setContactTarget] = useState<Profile | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterInterest, setFilterInterest] = useState('Tutte le competenze');
  const [filterActivity, setFilterActivity] = useState<typeof ALL_LEVELS | ActivityLevel>(ALL_LEVELS);
  const [scrolled, setScrolled] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError(null);
    const { data, error } = await supabase.rpc('get_all_talent_profiles', {
      p_company_id: session.id,
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
    fetchProfiles();
  }, [fetchProfiles]);

  const interestOptions = [...new Set(profiles.flatMap(p => p.interests || []))].sort();

  const filtered = profiles.filter(p => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || displayName(p).toLowerCase().includes(q)
      || (p.school ?? '').toLowerCase().includes(q)
      || (p.interests || []).some(i => i.toLowerCase().includes(q));
    const matchInterest = filterInterest === 'Tutte le competenze' || (p.interests || []).includes(filterInterest);
    const matchActivity = filterActivity === ALL_LEVELS || activityLevel(p) === filterActivity;
    return matchSearch && matchInterest && matchActivity;
  });

  const resetFilters = () => {
    setSearch('');
    setFilterInterest('Tutte le competenze');
    setFilterActivity(ALL_LEVELS);
  };

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
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, is_saved: true } : p));
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
    setProfiles(prev => prev.map(p => p.id === contactTarget.id ? { ...p, is_contacted: true } : p));
    showToast(`Messaggio inviato a ${contactTarget.first_name || 'lo studente'}`);
    setContactTarget(null);
  };

  return (
    <div className="h-full flex flex-col">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold animate-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      {/* Header — fuori dall'area scrollabile, non può mai essere sovrapposto dalle card */}
      <div className="shrink-0 pb-4">
        <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Talenti di Domani</h1>
        <p className="text-sm text-gray-400 mt-0.5 mb-4">
          Scopri studenti e giovani talenti con competenze innovative
        </p>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text" placeholder="Cerca..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all bg-white"
            />
          </div>
          <FilterDropdown
            icon={<SlidersHorizontal size={12} />}
            value={filterInterest}
            options={['Tutte le competenze', ...interestOptions]}
            onChange={setFilterInterest}
            widthClass="w-full md:w-52"
          />
          <FilterDropdown
            icon={<SlidersHorizontal size={12} />}
            value={filterActivity}
            options={[ALL_LEVELS, 'Alto', 'Medio', 'Basso']}
            onChange={v => setFilterActivity(v as typeof filterActivity)}
            widthClass="w-full md:w-56"
          />
        </div>
      </div>

      {/* Lista — scroll indipendente dal resto della pagina */}
      <div
        className="flex-1 min-h-0 overflow-y-auto relative"
        onScroll={e => setScrolled(e.currentTarget.scrollTop > 0)}
      >
        {scrolled && (
          <div className="sticky top-0 -mb-5 h-5 bg-gradient-to-b from-[#F5F6F8] to-transparent pointer-events-none z-10" />
        )}

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
            Assicurati di aver eseguito <strong>get_all_talent_profiles.sql</strong> nel SQL Editor di Supabase.
          </p>
        </div>
      ) : profiles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Users size={24} className="text-gray-300" />
          </div>
          <p className="font-bold text-gray-700 text-sm mb-1">Nessun talento disponibile al momento</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            I profili appariranno qui man mano che gli studenti si iscrivono alla piattaforma.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Search size={24} className="text-gray-300" />
          </div>
          <p className="font-bold text-gray-700 text-sm mb-1">Nessun talento corrisponde ai filtri selezionati</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mb-4">
            Prova a modificare la ricerca o i filtri applicati.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-colors">
            Reimposta filtri
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
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
