import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Plus, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export type AssignmentMethod = 'manual' | 'event' | 'goal';
export type GoalType = 'events_completed' | 'profile_completion';

export interface AssignmentData {
  method: AssignmentMethod;
  events: string[];
  goalType: GoalType | null;
  threshold: number;
  requireEmailVerification: boolean;
}

interface EventOption {
  id: string;
  name: string;
  event_date: string;
}

interface Props {
  value: AssignmentData;
  onChange: (data: AssignmentData) => void;
}

const RADIO_DOT = ({ active }: { active: boolean }) => (
  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
    active ? 'border-[#E8792F]' : 'border-gray-300'
  }`}>
    {active && <div className="w-2 h-2 rounded-full bg-[#E8792F]" />}
  </div>
);

export const BadgeAssignmentMethod: React.FC<Props> = ({ value, onChange }) => {
  const [eventi, setEventi]         = useState<EventOption[]>([]);
  const [searchEventi, setSearch]   = useState('');
  const [showDropdown, setDropdown] = useState(false);
  const dropdownRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('events').select('id, name, event_date').order('event_date', { ascending: false })
      .then(({ data }) => setEventi((data ?? []) as EventOption[]));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const set = (partial: Partial<AssignmentData>) => onChange({ ...value, ...partial });

  const toggleEvent = (id: string) => {
    const next = value.events.includes(id)
      ? value.events.filter(e => e !== id)
      : [...value.events, id];
    set({ events: next });
  };

  const filteredEventi = eventi.filter(e =>
    !searchEventi || e.name.toLowerCase().includes(searchEventi.toLowerCase())
  );

  const selectedEventi = eventi.filter(e => value.events.includes(e.id));

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        Metodo di assegnazione <span className="text-red-500">*</span>
      </label>

      <div className="bg-[#F3F4F6] rounded-xl overflow-hidden divide-y divide-gray-200">

        {/* ── Opzione 1: Manuale ── */}
        <button
          type="button"
          onClick={() => set({ method: 'manual' })}
          className={`w-full text-left px-4 py-4 transition-colors ${
            value.method === 'manual' ? 'bg-white/70' : 'hover:bg-white/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <RADIO_DOT active={value.method === 'manual'} />
            <div>
              <p className={`text-sm font-semibold ${value.method === 'manual' ? 'text-[#E8792F]' : 'text-gray-800'}`}>
                Può essere assegnato manualmente
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Gli amministratori potranno assegnare questo badge agli studenti
              </p>
            </div>
          </div>
        </button>

        {/* ── Opzione 2: Automatico al completamento di un evento ── */}
        <div>
          <button
            type="button"
            onClick={() => set({ method: 'event' })}
            className={`w-full text-left px-4 py-4 transition-colors ${
              value.method === 'event' ? 'bg-white/70' : 'hover:bg-white/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <RADIO_DOT active={value.method === 'event'} />
              <div>
                <p className={`text-sm font-semibold ${value.method === 'event' ? 'text-[#E8792F]' : 'text-gray-800'}`}>
                  Può essere assegnato automaticamente al completamento di un evento
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Il badge verrà assegnato automaticamente quando lo studente completa eventi specifici
                </p>
              </div>
            </div>
          </button>

          {/* Sub-panel eventi */}
          {value.method === 'event' && (
            <div className="px-4 pb-4 pt-1 bg-white/70 space-y-3">
              <label className="block text-xs font-semibold text-gray-700">
                Seleziona evento/i <span className="text-red-500">*</span>
              </label>

              {/* Chip eventi selezionati */}
              {selectedEventi.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEventi.map(e => (
                    <span key={e.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                      {e.name}
                      <button type="button" onClick={() => toggleEvent(e.id)} className="text-gray-400 hover:text-gray-600">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Combobox ricerca */}
              <div className="relative" ref={dropdownRef}>
                <div
                  onClick={() => setDropdown(v => !v)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-gray-200 bg-white cursor-pointer text-sm text-gray-600 hover:border-orange-300 transition-colors"
                >
                  <input
                    type="text"
                    placeholder="Cerca evento..."
                    value={searchEventi}
                    onChange={e => { setSearch(e.target.value); setDropdown(true); }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 outline-none text-sm placeholder-gray-400 bg-transparent"
                  />
                  <ChevronDown size={14} className="text-gray-400 shrink-0" />
                </div>
                {showDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                    {filteredEventi.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-gray-400 text-center">Nessun evento trovato</p>
                    ) : filteredEventi.map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => { toggleEvent(e.id); setSearch(''); }}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-orange-50 transition-colors flex items-center justify-between gap-2 ${
                          value.events.includes(e.id) ? 'text-[#E8792F] font-semibold bg-orange-50/50' : 'text-gray-700'
                        }`}
                      >
                        <span className="truncate">{e.name}</span>
                        {value.events.includes(e.id) && <X size={12} className="shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Il badge sarà assegnato automaticamente a ogni studente iscritto che completa tutti gli eventi selezionati
              </p>
            </div>
          )}
        </div>

        {/* ── Opzione 3: Automatico al raggiungimento di un obiettivo ── */}
        <div>
          <button
            type="button"
            onClick={() => set({ method: 'goal' })}
            className={`w-full text-left px-4 py-4 transition-colors ${
              value.method === 'goal' ? 'bg-white/70' : 'hover:bg-white/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <RADIO_DOT active={value.method === 'goal'} />
              <div>
                <p className={`text-sm font-semibold ${value.method === 'goal' ? 'text-[#E8792F]' : 'text-gray-800'}`}>
                  Può essere assegnato automaticamente al raggiungimento di un obiettivo
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Il badge verrà assegnato automaticamente quando lo studente raggiunge un obiettivo predefinito
                </p>
              </div>
            </div>
          </button>

          {/* Sub-panel obiettivo */}
          {value.method === 'goal' && (
            <div className="px-4 pb-4 pt-1 bg-white/70 space-y-2.5">
              <label className="block text-xs font-semibold text-gray-700">
                Tipo di obiettivo <span className="text-red-500">*</span>
              </label>

              <div className="ml-6 space-y-2">

                {/* Sotto-opzione: N eventi conclusi */}
                <div
                  onClick={() => set({ goalType: 'events_completed' })}
                  className={`rounded-lg border cursor-pointer transition-colors p-3 ${
                    value.goalType === 'events_completed'
                      ? 'border-orange-300 bg-[#FDEBDD]/60'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <RADIO_DOT active={value.goalType === 'events_completed'} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{value.threshold} eventi conclusi</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        Il badge viene assegnato quando {value.threshold} eventi a cui lo studente era iscritto sono terminati
                      </p>

                      {/* Campo soglia */}
                      {value.goalType === 'events_completed' && (
                        <div className="mt-3" onClick={e => e.stopPropagation()}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Numero di eventi richiesti
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => set({ threshold: Math.max(1, value.threshold - 1) })}
                              className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={value.threshold}
                              onChange={e => set({ threshold: Math.max(1, Number(e.target.value)) })}
                              className="w-16 text-center px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:border-orange-400"
                            />
                            <button
                              type="button"
                              onClick={() => set({ threshold: value.threshold + 1 })}
                              className="w-7 h-7 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sotto-opzione: Completamento profilo */}
                <div
                  onClick={() => set({ goalType: 'profile_completion' })}
                  className={`rounded-lg border cursor-pointer transition-colors p-3 ${
                    value.goalType === 'profile_completion'
                      ? 'border-orange-300 bg-[#FDEBDD]/60'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <RADIO_DOT active={value.goalType === 'profile_completion'} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Completamento profilo</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        Il badge viene assegnato quando lo studente completa il proprio profilo al 100%
                      </p>

                      {/* Checkbox verifica email */}
                      {value.goalType === 'profile_completion' && (
                        <label
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-2 mt-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={value.requireEmailVerification}
                            onChange={e => set({ requireEmailVerification: e.target.checked })}
                            className="w-4 h-4 accent-[#E8792F] rounded"
                          />
                          <span className="text-xs text-gray-600">Richiedi anche verifica email</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
