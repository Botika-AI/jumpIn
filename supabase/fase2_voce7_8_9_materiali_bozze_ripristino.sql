-- ============================================================
-- RIPRISTINO di fase2_voce7_8_9_materiali_bozze.sql
-- ============================================================
-- Rimette le policy com'erano (19/11/2026) e toglie lo spazio "materiali".
-- ATTENZIONE: lo spazio si può togliere solo se è vuoto. Se Supabase
-- rifiuta la riga "DELETE FROM storage.buckets" (le versioni recenti non
-- permettono di cancellare dalle tabelle di storage via SQL), toglierla
-- dallo script e cancellare lo spazio "materiali" dal pannello Storage.
-- ============================================================

BEGIN;

-- Voce 9
DROP POLICY "events_select_authenticated" ON public.events;
CREATE POLICY "events_select_authenticated" ON public.events
  FOR SELECT TO authenticated
  USING (auth_is_admin() OR stato = 'pubblicato' OR stato IS NULL);

-- Voce 8
DROP POLICY "materiali lettura admin o accettati" ON storage.objects;
DROP POLICY "materiali caricamento admin"         ON storage.objects;
DROP POLICY "materiali modifica admin"            ON storage.objects;
DROP POLICY "materiali cancellazione admin"       ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'materiali';

-- Voce 7
DROP POLICY "materiali_select_accettati" ON public.materiali_eventi;
CREATE POLICY "Autenticati leggono materiali" ON public.materiali_eventi
  FOR SELECT TO authenticated
  USING (true);

COMMIT;
