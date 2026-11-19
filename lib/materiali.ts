import { supabase } from './supabase';

/**
 * Materiali degli Eventi.
 *
 * - tipo "link": `url` è un indirizzo esterno.
 * - tipo "file": `url` è il percorso nello spazio PRIVATO "materiali"
 *   (`{event_id}/{file}`). Si apre solo con un link temporaneo.
 *
 * Il database restituisce i Materiali solo all'admin e agli studenti con
 * Iscrizione accettata all'Evento; lo spazio "materiali" applica la stessa regola.
 */
export interface Materiale {
  id: string;
  event_id: string;
  titolo: string;
  tipo: 'link' | 'file';
  url: string;
  created_at?: string;
  /** Solo per i file: percorso nello spazio privato (quando `url` è già il link temporaneo). */
  percorso?: string;
}

const BUCKET = 'materiali';
const DURATA_LINK_SECONDI = 60 * 60;

const ePercorsoPrivato = (m: Pick<Materiale, 'tipo' | 'url'>) =>
  m.tipo === 'file' && !/^https?:\/\//.test(m.url);

/**
 * Carica i Materiali di un Evento; per i file sostituisce il percorso con un link
 * temporaneo (valido un'ora), da usare direttamente come href.
 */
export async function caricaMateriali(eventId: string): Promise<Materiale[]> {
  const { data, error } = await supabase.from('materiali_eventi')
    .select('*').eq('event_id', eventId).order('created_at');
  if (error) { console.error('materiali_eventi error:', error); return []; }

  const materiali = (data ?? []) as Materiale[];
  const percorsi = materiali.filter(ePercorsoPrivato).map(m => m.url);
  if (percorsi.length === 0) return materiali;

  const { data: firmati, error: firmaErr } = await supabase.storage.from(BUCKET)
    .createSignedUrls(percorsi, DURATA_LINK_SECONDI);
  if (firmaErr) console.error('createSignedUrls error:', firmaErr);
  const linkPerPercorso = new Map((firmati ?? []).map(f => [f.path, f.signedUrl]));

  // Un file senza link temporaneo (es. cancellato dallo spazio) non si mostra.
  return materiali.flatMap(m => {
    if (!ePercorsoPrivato(m)) return [m];
    const link = linkPerPercorso.get(m.url);
    return link ? [{ ...m, url: link, percorso: m.url }] : [];
  });
}

/** Admin: carica un file nello spazio privato e restituisce il percorso da salvare in `url`. */
export async function caricaFileMateriale(
  eventId: string,
  file: File,
): Promise<{ percorso: string } | { errore: string }> {
  const nomeSicuro = file.name.normalize('NFD').replace(/[^\w.-]+/g, '_');
  const percorso = `${eventId}/${Date.now()}_${nomeSicuro}`;
  const { error } = await supabase.storage.from(BUCKET).upload(percorso, file);
  return error ? { errore: 'Errore upload: ' + error.message } : { percorso };
}

/** Admin: elimina un Materiale e, se è un file dello spazio privato, anche il file. */
export async function eliminaMateriale(m: Materiale): Promise<string | null> {
  const { error } = await supabase.from('materiali_eventi').delete().eq('id', m.id);
  if (error) return 'Errore durante l\'eliminazione. Riprova.';
  if (m.percorso) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([m.percorso]);
    if (rmErr) console.error('Rimozione file materiale non riuscita:', rmErr);
  }
  return null;
}
