import { supabase } from './supabase';

export type StatoIscrizione = 'in_attesa' | 'accettata' | 'rifiutata';

/** Messaggio per l'utente quando il database rifiuta una scrittura su iscrizioni_eventi. */
export function messaggioErroreIscrizione(error: { code?: string } | null): string {
  if (error?.code === '23514') return 'Posti esauriti per questo evento.';
  if (error?.code === '42501') return 'Operazione non consentita.';
  return 'Errore durante il salvataggio. Riprova.';
}

/** Iscrizioni accettate per evento, senza sapere chi sono (RPC posti_accettati). */
export async function caricaPostiAccettati(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('posti_accettati');
  if (error) { console.error('posti_accettati error:', error); return {}; }
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { event_id: string; accettate: number }[]) {
    counts[row.event_id] = row.accettate;
  }
  return counts;
}

/**
 * Lo studente chiede di iscriversi (stato "in_attesa").
 * Il database rifiuta oltre i Posti (23514) e dopo la scadenza o l'inizio dell'evento (42501).
 */
export async function richiediIscrizione(eventId: string, userId: string): Promise<string | null> {
  const { error } = await supabase.from('iscrizioni_eventi')
    .insert({ event_id: eventId, user_id: userId, stato: 'in_attesa' });
  if (!error) return null;
  if (error.code === '23514') return 'Posti esauriti per questo evento.';
  if (error.code === '42501') return 'Le iscrizioni a questo evento sono chiuse.';
  if (error.code === '23505') return 'Sei già iscritto a questo evento.';
  return 'Errore durante l\'iscrizione. Riprova.';
}

/**
 * Lo studente annulla la propria Iscrizione. Il database lo permette solo prima
 * dell'inizio dell'evento e non per le iscrizioni rifiutate: in quei casi non
 * dà errore ma non cancella nulla, quindi si controllano le righe cancellate.
 */
export async function annullaIscrizione(eventId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('iscrizioni_eventi')
    .delete().eq('event_id', eventId).eq('user_id', userId).select('id');
  if (error) return 'Errore durante l\'annullamento. Riprova.';
  if (!data || data.length === 0) return 'Non è più possibile annullare: l\'evento è già iniziato.';
  return null;
}

/**
 * Notifica allo studente l'esito della sua Iscrizione.
 * `rimosso`: lo studente era già accettato e l'admin lo ha rimosso (stato → rifiutata, Q14).
 */
export async function notificaEsitoIscrizione(
  userId: string,
  stato: StatoIscrizione,
  nomeEvento: string,
  eventId: string,
  rimosso = false,
): Promise<void> {
  if (stato === 'in_attesa') return;
  const [titolo, corpo] =
    rimosso                 ? ['Iscrizione annullata', `La tua partecipazione a "${nomeEvento}" è stata annullata dall'organizzazione.`]
    : stato === 'accettata' ? ['Iscrizione accettata', `La tua iscrizione a "${nomeEvento}" è stata accettata. Ci vediamo lì!`]
    :                         ['Iscrizione rifiutata', `La tua iscrizione a "${nomeEvento}" non è stata accettata questa volta.`];
  const { error } = await supabase.from('notifiche').insert({
    user_id: userId, tipo: 'evento', titolo, corpo, riferimento_id: eventId,
  });
  if (error) console.error('Notifica error:', error);
}

/**
 * Cambia lo stato di una o più Iscrizioni (admin).
 *
 * Le accettazioni si salvano una alla volta, nell'ordine ricevuto: il database
 * (trigger iscrizioni_controlla_posti) rifiuta quelle oltre i Posti, quindi si
 * accettano le prime finché ci sono posti e ci si ferma al primo rifiuto.
 * Gli altri stati si salvano in un solo comando.
 *
 * Restituisce gli id salvati davvero e, se c'è stato, il messaggio d'errore.
 */
export async function aggiornaStatoIscrizioni(
  ids: string[],
  stato: StatoIscrizione,
): Promise<{ salvati: string[]; errore: string | null }> {
  if (ids.length === 0) return { salvati: [], errore: null };

  if (stato !== 'accettata') {
    const { error } = await supabase.from('iscrizioni_eventi').update({ stato }).in('id', ids);
    return error
      ? { salvati: [], errore: messaggioErroreIscrizione(error) }
      : { salvati: ids, errore: null };
  }

  const salvati: string[] = [];
  for (const id of ids) {
    const { error } = await supabase.from('iscrizioni_eventi').update({ stato }).eq('id', id);
    if (error) {
      const motivo = messaggioErroreIscrizione(error);
      const errore = salvati.length > 0
        ? `${motivo} ${salvati.length === 1 ? 'Accettata 1 iscrizione' : `Accettate ${salvati.length} iscrizioni`} su ${ids.length}.`
        : motivo;
      return { salvati, errore };
    }
    salvati.push(id);
  }
  return { salvati, errore: null };
}
