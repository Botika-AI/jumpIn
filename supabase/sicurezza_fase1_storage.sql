-- =====================================================================
-- SICUREZZA — FASE 1 (problema D): bucket badge-icon   preparato il 18/11/2026
-- Prima: chiunque (anche senza login) può caricare, sovrascrivere e cancellare.
-- Dopo: tutti possono leggere; caricare/sovrascrivere/cancellare solo l'admin.
-- L'admin carica con upsert: servono INSERT + UPDATE (+ SELECT).
-- Separato dagli altri: le regole dei file stanno in uno schema gestito da Supabase.
-- =====================================================================

BEGIN;

DROP POLICY IF EXISTS "badge-icon all" ON storage.objects;

DROP POLICY IF EXISTS "badge-icon lettura" ON storage.objects;
CREATE POLICY "badge-icon lettura" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'badge-icon');

DROP POLICY IF EXISTS "badge-icon caricamento admin" ON storage.objects;
CREATE POLICY "badge-icon caricamento admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'badge-icon' AND public.auth_is_admin());

DROP POLICY IF EXISTS "badge-icon modifica admin" ON storage.objects;
CREATE POLICY "badge-icon modifica admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'badge-icon' AND public.auth_is_admin())
  WITH CHECK (bucket_id = 'badge-icon' AND public.auth_is_admin());

DROP POLICY IF EXISTS "badge-icon cancellazione admin" ON storage.objects;
CREATE POLICY "badge-icon cancellazione admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'badge-icon' AND public.auth_is_admin());

COMMIT;

-- Verifica (sola lettura) — atteso: 4 righe, nessuna "badge-icon all"
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'badge-icon%'
ORDER BY policyname;

-- ---------------------------------------------------------------------
-- RIPRISTINO (eseguire solo se serve tornare indietro):
-- BEGIN;
-- DROP POLICY IF EXISTS "badge-icon lettura"             ON storage.objects;
-- DROP POLICY IF EXISTS "badge-icon caricamento admin"   ON storage.objects;
-- DROP POLICY IF EXISTS "badge-icon modifica admin"      ON storage.objects;
-- DROP POLICY IF EXISTS "badge-icon cancellazione admin" ON storage.objects;
-- CREATE POLICY "badge-icon all" ON storage.objects FOR ALL TO public
--   USING (bucket_id = 'badge-icon') WITH CHECK (bucket_id = 'badge-icon');
-- COMMIT;
-- ---------------------------------------------------------------------
