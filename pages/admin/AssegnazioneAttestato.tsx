import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, ScrollText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Student {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  school: string | null;
}

interface Props {
  certificato: {
    id: string;
    titolo: string;
    event_id: string | null;
    event_name?: string;
  };
  onBack: () => void;
}

export const AssegnazioneAttestato: React.FC<Props> = ({ certificato, onBack }) => {
  const [participants, setParticipants] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [search, setSearch]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      let studentList: Student[] = [];

      if (certificato.event_id) {
        const { data: iscr } = await supabase
          .from('iscrizioni_eventi')
          .select('user_id')
          .eq('event_id', certificato.event_id)
          .neq('stato', 'rifiutata');

        const userIds = (iscr ?? []).map((r: any) => r.user_id as string);

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, school')
            .in('id', userIds)
            .order('last_name');
          studentList = (profiles ?? []) as Student[];
        }
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, school')
          .order('last_name');
        studentList = (data ?? []) as Student[];
      }

      setParticipants(studentList);

      // Carica assegnazioni esistenti
      const { data: existing } = await supabase
        .from('certificati_assegnazioni')
        .select('user_id')
        .eq('certificato_id', certificato.id);

      const existingIds = new Set((existing ?? []).map((r: any) => r.user_id as string));

      // Se nessuno è ancora assegnato, pre-seleziona tutti
      if (existingIds.size === 0) {
        setSelectedIds(new Set(studentList.map(s => s.id)));
      } else {
        setSelectedIds(existingIds);
      }

      setLoading(false);
    };

    load();
  }, [certificato.id, certificato.event_id]);

  const visibleStudents = participants.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = [s.first_name, s.last_name].filter(Boolean).join(' ').toLowerCase();
    return name.includes(q) || s.email.toLowerCase().includes(q);
  });

  const toggleStudent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll   = () => setSelectedIds(new Set(participants.map(s => s.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const allSelected = participants.length > 0 && selectedIds.size === participants.length;

  const handleSave = async () => {
    setSaving(true);

    // Elimina tutti i precedenti, poi inserisce la selezione corrente
    await supabase.from('certificati_assegnazioni').delete().eq('certificato_id', certificato.id);

    if (selectedIds.size > 0) {
      await supabase.from('certificati_assegnazioni').insert(
        [...selectedIds].map(uid => ({ certificato_id: certificato.id, user_id: uid }))
      );
    }

    setSaving(false);
    setSuccessMsg(`Certificato assegnato a ${selectedIds.size} student${selectedIds.size === 1 ? 'e' : 'i'}`);
    setTimeout(() => { setSuccessMsg(null); onBack(); }, 1800);
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">

      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft size={14} />
        Torna a Badge e Attestati
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-montserrat text-gray-900">Assegna Certificato</h1>
        <p className="text-sm text-gray-500 mt-1">Seleziona gli studenti che riceveranno questo certificato</p>
      </div>

      {/* Contesto certificato */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-7 h-7 rounded-full bg-[#FDEBDD] flex items-center justify-center shrink-0">
          <ScrollText size={14} className="text-[#E8792F]" />
        </div>
        <span className="text-sm font-semibold text-gray-700">{certificato.titolo}</span>
        {certificato.event_name && (
          <span className="text-sm text-gray-400">· {certificato.event_name}</span>
        )}
      </div>

      {successMsg && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-700">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Barra di ricerca */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca studente per nome o email..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white"
              />
            </div>

            {/* Seleziona / Deseleziona tutti */}
            <div className="flex items-center gap-2 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => e.target.checked ? selectAll() : deselectAll()}
                  className="w-4 h-4 accent-[#E8792F] rounded"
                />
                <span className="text-sm font-semibold text-gray-700">Seleziona tutti</span>
              </label>
            </div>

            {/* Lista partecipanti */}
            {participants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <p className="text-sm font-semibold text-gray-500">Nessun partecipante trovato</p>
                <p className="text-xs text-gray-400">
                  {certificato.event_id
                    ? 'Nessuno è ancora iscritto a questo evento.'
                    : 'Nessun utente registrato.'}
                </p>
              </div>
            ) : visibleStudents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nessun risultato per "{search}"</p>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {visibleStudents.map(s => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="w-4 h-4 accent-[#E8792F] rounded shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {[s.first_name, s.last_name].filter(Boolean).join(' ') || s.email}
                      </p>
                      <p className="text-xs text-gray-400">{s.school ?? s.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-3 text-right">
              <span className="text-xs text-gray-400">
                {selectedIds.size} di {participants.length} selezionati
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Annulla
        </button>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#E8792F] hover:bg-[#d06a25] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvataggio...' : 'Assegna certificato'}
        </button>
      </div>
    </div>
  );
};
