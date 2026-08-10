import React, { useState, useEffect } from 'react';
import { Award, FileText, Plus, UserPlus, Pencil, Trash2, X, ScrollText } from 'lucide-react';
import { CreaBadgeForm, BadgeData, BadgeInitialData } from './CreaBadgeForm';
import { CreaAttestatoForm, AttestatoData, AttestatoInitialData } from './CreaAttestatoForm';
import { AssegnazioneBadge } from './AssegnazioneBadge';
import { AssegnazioneAttestato } from './AssegnazioneAttestato';
import { supabase } from '../../lib/supabase';

type Tab = 'badges' | 'attestati';
type View = 'list' | 'create' | 'assegna' | 'assegna-cert';

interface Badge {
  id: string;
  nome: string;
  descrizione: string | null;
  icona_url: string | null;
  visibilita: string;
  tags: string[];
  assegnati: number;
}

interface Certificato {
  id: string;
  titolo: string;
  descrizione: string | null;
  immagine_url: string | null;
  visibilita: string;
  event_id: string | null;
  event_name?: string;
  campi_dinamici: string[];
  assegnati: number;
}

export const AdminBadge: React.FC = () => {
  const [tab, setTab]               = useState<Tab>('badges');
  const [view, setView]             = useState<View>('list');
  const [badges, setBadges]         = useState<Badge[]>([]);
  const [certificati, setCertificati] = useState<Certificato[]>([]);
  const [loading, setLoading]       = useState(true);
  const [dbError, setDbError]       = useState(false);
  const [editingBadge, setEditingBadge]     = useState<BadgeInitialData | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<Badge | null>(null);
  const [confirmDeleteCert, setConfirmDeleteCert]   = useState<Certificato | null>(null);
  const [editingCertificato, setEditingCertificato] = useState<AttestatoInitialData | null>(null);
  const [assigningBadge, setAssigningBadge]         = useState<Badge | null>(null);
  const [assigningCertificato, setAssigningCertificato] = useState<Certificato | null>(null);

  const loadBadges = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('badges')
      .select('id, nome, descrizione, icona_url, visibilita, tags')
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    const counts = await Promise.all(
      data.map(b =>
        supabase.from('badge_assegnazioni').select('id', { count: 'exact', head: true }).eq('badge_id', b.id)
      )
    );

    setBadges(data.map((b, i) => ({
      ...b,
      tags: b.tags ?? [],
      assegnati: counts[i].count ?? 0,
    })));
    setLoading(false);
  };

  const loadCertificati = async () => {
    setLoading(true);
    setDbError(false);
    const { data, error } = await supabase
      .from('certificati')
      .select('id, titolo, descrizione, immagine_url, visibilita, event_id, campi_dinamici, events(name)')
      .order('created_at', { ascending: false });

    if (error) { setDbError(true); setLoading(false); return; }

    const list = (data ?? []).map((c: any) => ({
      ...c,
      campi_dinamici: c.campi_dinamici ?? [],
      event_name: c.events?.name ?? null,
      assegnati: 0,
    }));

    const counts = await Promise.all(
      list.map((c: Certificato) =>
        supabase.from('certificati_assegnazioni').select('id', { count: 'exact', head: true }).eq('certificato_id', c.id)
      )
    );

    setCertificati(list.map((c: Certificato, i: number) => ({ ...c, assegnati: counts[i].count ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { loadBadges(); }, []);
  useEffect(() => { if (tab === 'attestati') loadCertificati(); }, [tab]);

  const handleDelete = async (badge: Badge) => {
    await supabase.from('badges').delete().eq('id', badge.id);
    setBadges(prev => prev.filter(b => b.id !== badge.id));
    setConfirmDelete(null);
  };

  const handleEdit = (b: Badge) => {
    setEditingBadge({
      id:          b.id,
      nome:        b.nome,
      descrizione: b.descrizione ?? '',
      iconaUrl:    b.icona_url,
      categoria:   '',
      visibilita:  b.visibilita as any,
      tags:        b.tags,
    });
    setView('create');
  };

  const handleSaveBadge = async (data: BadgeData) => {
    if (editingBadge) {
      const { error } = await supabase.from('badges').update({
        nome:        data.nome,
        descrizione: data.descrizione,
        icona_url:   data.iconaUrl,
        categoria:   data.categoria || null,
        visibilita:  data.visibilita,
        tags:        data.tags,
      }).eq('id', editingBadge.id);

      if (!error) {
        setBadges(prev => prev.map(b => b.id === editingBadge.id
          ? { ...b, nome: data.nome, descrizione: data.descrizione, icona_url: data.iconaUrl, visibilita: data.visibilita, tags: data.tags }
          : b
        ));
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('badges')
        .insert({
          nome:        data.nome,
          descrizione: data.descrizione,
          icona_url:   data.iconaUrl,
          categoria:   data.categoria || null,
          visibilita:  data.visibilita,
          tags:        data.tags,
        })
        .select()
        .single();

      if (!error && inserted) {
        setBadges(prev => [{ ...inserted, tags: inserted.tags ?? [], assegnati: 0 }, ...prev]);
      }
    }
    setEditingBadge(null);
    setView('list');
  };

  if (view === 'assegna' && assigningBadge) {
    return <AssegnazioneBadge badge={assigningBadge} onBack={() => { setAssigningBadge(null); setView('list'); loadBadges(); }} />;
  }

  if (view === 'assegna-cert' && assigningCertificato) {
    return (
      <AssegnazioneAttestato
        certificato={assigningCertificato}
        onBack={() => { setAssigningCertificato(null); setView('list'); loadCertificati(); }}
      />
    );
  }

  if (view === 'create' && tab === 'attestati') {
    return (
      <CreaAttestatoForm
        onBack={() => { setEditingCertificato(null); setView('list'); }}
        initialData={editingCertificato ?? undefined}
        onSave={async (data: AttestatoData) => {
          if (editingCertificato) {
            await supabase.from('certificati').update({
              titolo:         data.titolo,
              event_id:       data.event_id || null,
              immagine_url:   data.immagine_url,
              descrizione:    data.descrizione,
              campi_dinamici: data.campi_dinamici,
              visibilita:     data.visibilita,
            }).eq('id', editingCertificato.id);
          } else {
            await supabase.from('certificati').insert({
              titolo:         data.titolo,
              event_id:       data.event_id || null,
              immagine_url:   data.immagine_url,
              descrizione:    data.descrizione,
              campi_dinamici: data.campi_dinamici,
              visibilita:     data.visibilita,
            });
          }
          setEditingCertificato(null);
          await loadCertificati();
          setView('list');
        }}
      />
    );
  }

  if (view === 'create') {
    return (
      <CreaBadgeForm
        onBack={() => { setEditingBadge(null); setView('list'); }}
        onSave={handleSaveBadge}
        initialData={editingBadge ?? undefined}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-montserrat text-gray-900">Badge e Attestati</h1>
        <p className="text-sm text-gray-500 mt-1">Gestisci i Badge e gli Attestati per gli utenti</p>
      </div>

      {/* Tab pills */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab('badges')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'badges'
              ? 'bg-[#FDEBDD] text-[#E8792F]'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Award size={15} strokeWidth={2} />
          Badges
        </button>
        <button
          onClick={() => setTab('attestati')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'attestati'
              ? 'bg-[#FDEBDD] text-[#E8792F]'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <FileText size={15} strokeWidth={2} />
          Attestati
        </button>
      </div>

      {/* Card principale */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">

        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">
            {tab === 'badges' ? `${badges.length} badge` : `${certificati.length} attestati`}
          </p>
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 bg-[#E8792F] hover:bg-[#d06a25] text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={15} strokeWidth={2.5} />
            {tab === 'badges' ? 'Crea Badge' : 'Crea Attestato'}
          </button>
        </div>

        {/* Avviso tabella mancante */}
        {tab === 'attestati' && dbError && (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-semibold text-red-500 mb-2">Tabella certificati non trovata</p>
            <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
              Esegui la migration SQL nel dashboard Supabase per abilitare gli attestati.
            </p>
          </div>
        )}

        {/* Contenuto */}
        {!dbError && loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          </div>
        ) : !dbError && tab === 'badges' && badges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Award size={22} className="text-gray-300" />
            </div>
            <p className="font-bold font-montserrat text-gray-600 text-sm">Nessun badge creato</p>
            <p className="text-xs text-gray-400">Clicca su "Crea Badge" per iniziare</p>
          </div>
        ) : !dbError && tab === 'attestati' && certificati.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <FileText size={22} className="text-gray-300" />
            </div>
            <p className="font-bold font-montserrat text-gray-600 text-sm">Nessun attestato creato</p>
            <p className="text-xs text-gray-400">Clicca su "Crea Attestato" per iniziare</p>
          </div>
        ) : !dbError && tab === 'attestati' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 font-medium">
                  <th className="text-left px-6 py-3">Titolo</th>
                  <th className="text-left px-6 py-3">Evento</th>
                  <th className="text-left px-6 py-3">Visibilità</th>
                  <th className="text-left px-6 py-3">Assegnati</th>
                  <th className="text-right px-6 py-3">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {certificati.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#FDEBDD] flex items-center justify-center shrink-0">
                          <ScrollText size={16} className="text-[#E8792F]" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{c.titolo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{c.event_name ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF0F2] text-gray-600">
                        {c.visibilita === 'studenti' ? 'Pubblico' : 'Bozza'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{c.assegnati} studenti</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="Assegna studenti"
                          onClick={() => { setAssigningCertificato(c); setView('assegna-cert'); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#E8792F] hover:bg-[#FDEBDD] transition-colors"
                        >
                          <UserPlus size={15} />
                        </button>
                        <button
                          title="Modifica"
                          onClick={() => {
                            setEditingCertificato({
                              id:             c.id,
                              titolo:         c.titolo,
                              event_id:       c.event_id ?? '',
                              immagine_url:   c.immagine_url,
                              descrizione:    c.descrizione ?? '',
                              campi_dinamici: c.campi_dinamici,
                              visibilita:     c.visibilita as 'studenti' | 'bozza',
                            });
                            setView('create');
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          title="Elimina"
                          onClick={() => setConfirmDeleteCert(c)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 font-medium">
                  <th className="text-left px-6 py-3">Nome del Badge</th>
                  <th className="text-left px-6 py-3">Descrizione</th>
                  <th className="text-left px-6 py-3">Visibilità</th>
                  <th className="text-left px-6 py-3">Assegnato a</th>
                  <th className="text-right px-6 py-3">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {badges.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {b.icona_url && !b.icona_url.startsWith('blob:') ? (
                          <img
                            src={b.icona_url}
                            alt={b.nome}
                            className="w-10 h-10 rounded-lg object-contain bg-gray-50"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style'); }}
                          />
                        ) : null}
                        {(!b.icona_url || b.icona_url.startsWith('blob:')) && (
                          <div className="w-10 h-10 rounded-lg bg-[#FDEBDD] flex items-center justify-center shrink-0">
                            <Award size={18} className="text-[#E8792F]" />
                          </div>
                        )}
                        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{b.nome}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 line-clamp-1">{b.descrizione || '—'}</span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF0F2] text-gray-600">
                        {b.visibilita === 'studenti' ? 'Pubblico' : b.visibilita === 'interno' ? 'Interno' : 'Bozza'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{b.assegnati} studenti</span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button title="Assegna utente" onClick={() => { setAssigningBadge(b); setView('assegna'); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#E8792F] hover:bg-[#FDEBDD] transition-colors">
                          <UserPlus size={15} />
                        </button>
                        <button title="Modifica" onClick={() => handleEdit(b)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button title="Elimina" onClick={() => setConfirmDelete(b)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal conferma eliminazione certificato */}
      {confirmDeleteCert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-bold font-montserrat text-gray-900">Elimina attestato</h3>
              <button onClick={() => setConfirmDeleteCert(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Sei sicuro di voler eliminare <span className="font-semibold text-gray-900">"{confirmDeleteCert.titolo}"</span>? L'operazione non è reversibile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await supabase.from('certificati').delete().eq('id', confirmDeleteCert.id);
                  setCertificati(prev => prev.filter(c => c.id !== confirmDeleteCert.id));
                  setConfirmDeleteCert(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors"
              >
                Elimina
              </button>
              <button onClick={() => setConfirmDeleteCert(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal conferma eliminazione badge */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-base font-bold font-montserrat text-gray-900">Elimina badge</h3>
              <button onClick={() => setConfirmDelete(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Sei sicuro di voler eliminare il badge <span className="font-semibold text-gray-900">"{confirmDelete.nome}"</span>? L'operazione non è reversibile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors"
              >
                Elimina
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
