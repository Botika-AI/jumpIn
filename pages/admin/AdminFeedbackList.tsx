import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, X, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FeedbackRow {
  id: string;
  rating: number;
  positivo: string | null;
  miglioramento: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  school: string | null;
  event_name: string | null;
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <div
        key={n}
        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
          n <= rating ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {n}
      </div>
    ))}
  </div>
);

// ── Modale dettaglio feedback ───────────────────────────────────────────────────

const FeedbackDetailModal: React.FC<{ feedback: FeedbackRow; onClose: () => void }> = ({ feedback, onClose }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold font-montserrat text-[#1F2430] text-lg">
            {[feedback.first_name, feedback.last_name].filter(Boolean).join(' ') || 'Studente'}
          </h3>
          {feedback.school && <p className="text-xs text-gray-400 mt-0.5">{feedback.school}</p>}
          <p className="text-sm text-orange-500 font-semibold mt-1.5">{feedback.event_name ?? 'Evento'}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
          <X size={18} />
        </button>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">Valutazione</p>
        <StarRating rating={feedback.rating} />
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">Cosa ti è piaciuto di più?</p>
        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3.5 whitespace-pre-wrap">
          {feedback.positivo || <span className="text-gray-300 italic">Nessuna risposta</span>}
        </p>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-2">Cosa potremmo migliorare?</p>
        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3.5 whitespace-pre-wrap">
          {feedback.miglioramento || <span className="text-gray-300 italic">Nessuna risposta</span>}
        </p>
      </div>

      <p className="text-xs text-gray-400">
        Inviato il {new Date(feedback.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  </div>
);

// ── Lista feedback ───────────────────────────────────────────────────────────────

export const AdminFeedbackList: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<FeedbackRow | null>(null);

  useEffect(() => {
    supabase
      .from('feedback_eventi')
      .select('id, rating, positivo, miglioramento, created_at, profiles(first_name, last_name, school), events(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setFeedback((data ?? []).map((r: any) => ({
          id: r.id,
          rating: r.rating,
          positivo: r.positivo,
          miglioramento: r.miglioramento,
          created_at: r.created_at,
          first_name: r.profiles?.first_name ?? null,
          last_name: r.profiles?.last_name ?? null,
          school: r.profiles?.school ?? null,
          event_name: r.events?.name ?? null,
        })));
        setLoading(false);
      });
  }, []);

  const filtered = feedback.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = [f.first_name, f.last_name].filter(Boolean).join(' ').toLowerCase();
    return name.includes(q) || (f.event_name ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft size={14} /> Torna alla dashboard
        </button>
        <h1 className="text-2xl font-bold font-montserrat text-[#1F2430]">Feedback raccolti</h1>
        <p className="text-sm text-gray-500 mt-1">Tutte le valutazioni lasciate dagli studenti al termine degli eventi</p>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 max-w-sm shadow-sm">
        <Search size={15} className="text-gray-300 shrink-0" />
        <input type="text" placeholder="Cerca studente o evento..."
          className="bg-transparent text-sm text-gray-700 placeholder-gray-300 outline-none flex-1"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['Studente', 'Evento', 'Stelle', 'Feedback', ''].map(h => (
                <th key={h} className="text-left px-6 py-4 text-sm font-bold text-[#1F2430] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-16 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-16 text-center text-sm text-gray-400">
                {feedback.length === 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquare size={22} className="text-gray-300" />
                    Nessun feedback ricevuto ancora.
                  </div>
                ) : 'Nessun risultato.'}
              </td></tr>
            ) : filtered.map((f, i) => {
              const testo = [f.positivo, f.miglioramento].filter(Boolean).join(' · ');
              return (
                <tr key={f.id} className={i < filtered.length - 1 ? 'border-b border-gray-50' : ''} style={{ height: 64 }}>
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-[#1F2430]">
                      {[f.first_name, f.last_name].filter(Boolean).join(' ') || '—'}
                    </p>
                    {f.school && <p className="text-xs text-gray-400">{f.school}</p>}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{f.event_name ?? '—'}</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-500">
                      {f.rating}/5
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 max-w-xs">
                    {testo ? truncate(testo, 60) : <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-6 py-3">
                    <button onClick={() => setSelected(f)}
                      className="text-sm font-semibold text-[#F0813C] hover:text-orange-600 transition-colors whitespace-nowrap">
                      Apri
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && feedback.length > 0 && (
        <p className="text-xs text-gray-400">
          {filtered.length} feedback trovat{filtered.length === 1 ? 'o' : 'i'}
          {feedback.length !== filtered.length && ` su ${feedback.length} totali`}
        </p>
      )}

      {selected && <FeedbackDetailModal feedback={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
