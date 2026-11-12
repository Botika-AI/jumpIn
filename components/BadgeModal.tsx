import React from 'react';
import { Award, CheckCircle2 } from 'lucide-react';

export interface RealBadge {
  id: string;
  nome: string;
  descrizione: string | null;
  icona_url: string | null;
  categoria: string | null;
  tags: string[];
  assegnato_at: string;
}

export const BadgeModal: React.FC<{ badge: RealBadge; onClose: () => void }> = ({ badge, onClose }) => (
  <div
    className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-0 sm:px-6"
    onClick={onClose}
  >
    <div
      className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {/* Header bianco */}
      <div className="px-6 pt-8 pb-5 flex flex-col items-center gap-3">
        {badge.icona_url && !badge.icona_url.startsWith('blob:') ? (
          <div className="w-24 h-24 rounded-2xl bg-white overflow-hidden">
            <img
              src={badge.icona_url}
              alt={badge.nome}
              className="w-full h-full object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        ) : (
          <div className="w-24 h-24 bg-[#FDEBDD] rounded-2xl flex items-center justify-center">
            <Award size={44} className="text-[#E8792F]" strokeWidth={1.5} />
          </div>
        )}
        <div className="text-center">
          <p className="font-bold font-montserrat text-gray-900 text-lg leading-tight">{badge.nome}</p>
          {badge.categoria && (
            <p className="text-gray-400 text-xs mt-0.5">{badge.categoria}</p>
          )}
        </div>
      </div>

      <div className="border-t border-[#E8792F]/30 mx-6" />

      {/* Corpo */}
      <div className="px-6 py-5 space-y-4">
        {badge.descrizione && (
          <p className="text-sm text-gray-600 leading-relaxed">{badge.descrizione}</p>
        )}
        {badge.tags && badge.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badge.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-full bg-[#FDEBDD] text-[#E8792F] text-xs font-semibold">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <CheckCircle2 size={14} className="text-green-500 shrink-0" />
          Ottenuto il {new Date(badge.assegnato_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Chiudi
        </button>
      </div>
    </div>
  </div>
);
