import React, { useState, useEffect } from 'react';
import { Award, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { RealBadge, BadgeModal } from './BadgeModal';

export const BadgeSection: React.FC<{ userId: string }> = ({ userId }) => {
  const [badges, setBadges]     = useState<RealBadge[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<RealBadge | null>(null);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    supabase
      .from('badge_assegnazioni')
      .select('assegnato_at, badges(id, nome, descrizione, icona_url, categoria, tags)')
      .eq('user_id', userId)
      .order('assegnato_at', { ascending: false })
      .then(({ data }) => {
        setBadges(
          (data ?? []).map((row: any) => ({
            id:           row.badges.id,
            nome:         row.badges.nome,
            descrizione:  row.badges.descrizione,
            icona_url:    row.badges.icona_url,
            categoria:    row.badges.categoria ?? null,
            tags:         row.badges.tags ?? [],
            assegnato_at: row.assegnato_at,
          }))
        );
        setLoading(false);
      });
  }, [userId]);

  const filtered = badges.filter(b => {
    const q = search.trim().toLowerCase();
    return !q || b.nome.toLowerCase().includes(q) || (b.descrizione ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-full">

      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-gray-50 px-4 pt-4 pb-3">
        <div className="max-w-md mx-auto">
          <div className="mb-3">
            <h1 className="text-xl font-bold font-montserrat text-gray-900">Badge</h1>
            <p className="text-xs text-gray-400 mt-0.5">Visualizza i badge che hai ottenuto</p>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text" placeholder="Cerca..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-md mx-auto px-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          </div>
        ) : badges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Award size={24} className="text-gray-400" />
            </div>
            <p className="font-bold font-montserrat text-gray-700">Nessun badge ancora</p>
            <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
              Completa esperienze e partecipa agli eventi per guadagnare badge
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Search size={24} className="text-gray-300" />
            </div>
            <p className="font-bold font-montserrat text-gray-700 text-sm">Nessun badge trovato</p>
            <button onClick={() => setSearch('')} className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors">
              Cancella ricerca
            </button>
          </div>
        ) : (
          <>
            {selected && <BadgeModal badge={selected} onClose={() => setSelected(null)} />}
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-3">
              {filtered.length} {filtered.length === 1 ? 'badge ottenuto' : 'badge ottenuti'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(badge => (
                <div
                  key={badge.id}
                  onClick={() => setSelected(badge)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center text-center gap-1.5 cursor-pointer active:bg-gray-50 transition-colors"
                >
                  {badge.icona_url && !badge.icona_url.startsWith('blob:') ? (
                    <img
                      src={badge.icona_url}
                      alt={badge.nome}
                      className="w-28 h-28 rounded-xl object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-28 h-28 bg-[#FDEBDD] rounded-xl flex items-center justify-center">
                      <Award size={48} className="text-[#E8792F]" strokeWidth={1.75} />
                    </div>
                  )}
                  <p className="font-bold font-montserrat text-gray-900 text-sm leading-snug line-clamp-2 mt-1">{badge.nome}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
