-- ============================================================
-- Fase 2 / voci 7, 8, 9 — Materiali riservati, spazio privato, bozze (Q18, Q19, Q22)
-- ============================================================
-- Development E Production.
--
-- Voce 7 — materiali_eventi: uno studente legge i Materiali solo degli
--   Eventi a cui ha un'Iscrizione accettata. L'admin li gestisce tutti
--   (policy "Admin gestisce materiali", invariata).
--
-- Voce 8 — nuovo spazio PRIVATO "materiali" per i file:
--   percorso dei file: {event_id}/{nome file}
--   - lettura (e quindi link temporanei): admin, oppure studente con
--     Iscrizione accettata all'evento della cartella;
--   - caricamento, modifica, cancellazione: solo admin.
--   Il codice va aggiornato (caricare qui e aprire i file con link
--   temporanei invece del link pubblico di "logos"): fino ad allora lo
--   spazio resta vuoto e non cambia nulla. Oggi non ci sono file di
--   materiali in "logos" (0 su Dev e Prod): nessuno spostamento.
--
-- Voce 9 — events: gli studenti vedono solo gli Eventi pubblicati
--   (tolto "OR stato IS NULL"; 0 eventi senza stato su Dev e Prod).
--
-- Policy prima della modifica (uguali su Dev e Prod, 19/11/2026):
--   materiali_eventi "Autenticati leggono materiali"  SELECT {authenticated} USING (true)
--   events "events_select_authenticated"              SELECT {authenticated}
--     USING (auth_is_admin() OR stato = 'pubblicato' OR stato IS NULL)
--
-- Ripristino: fase2_voce7_8_9_materiali_bozze_ripristino.sql
-- ============================================================

BEGIN;

-- ── Voce 7 ───────────────────────────────────────────────────
DROP POLICY "Autenticati leggono materiali" ON public.materiali_eventi;

CREATE POLICY "materiali_select_accettati" ON public.materiali_eventi
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.iscrizioni_eventi i
      WHERE i.event_id = materiali_eventi.event_id
        AND i.user_id  = auth.uid()
        AND i.stato    = 'accettata'
    )
  );

-- ── Voce 8 ───────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('materiali', 'materiali', false);

CREATE POLICY "materiali lettura admin o accettati" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'materiali'
    AND (
      public.auth_is_admin()
      OR EXISTS (
        SELECT 1 FROM public.iscrizioni_eventi i
        WHERE i.event_id = (storage.foldername(objects.name))[1]
          AND i.user_id  = auth.uid()
          AND i.stato    = 'accettata'
      )
    )
  );

CREATE POLICY "materiali caricamento admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materiali' AND public.auth_is_admin());

CREATE POLICY "materiali modifica admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'materiali' AND public.auth_is_admin())
  WITH CHECK (bucket_id = 'materiali' AND public.auth_is_admin());

CREATE POLICY "materiali cancellazione admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materiali' AND public.auth_is_admin());

-- ── Voce 9 ───────────────────────────────────────────────────
DROP POLICY "events_select_authenticated" ON public.events;

CREATE POLICY "events_select_authenticated" ON public.events
  FOR SELECT TO authenticated
  USING (public.auth_is_admin() OR stato = 'pubblicato');

COMMIT;


-- ============================================================
-- Verifica (sola lettura): eseguire dopo il COMMIT
-- Atteso: bucket "materiali" privato; materiali_select_accettati;
-- 4 policy storage "materiali ..."; events_select_authenticated senza "IS NULL"
-- ============================================================
-- SELECT 'policy' AS tipo, tablename || ' · ' || policyname AS nome, cmd, qual, with_check
-- FROM pg_policies
-- WHERE (schemaname = 'public' AND tablename IN ('materiali_eventi', 'events'))
--    OR (schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'materiali%')
-- UNION ALL
-- SELECT 'bucket', id, CASE WHEN public THEN 'pubblico' ELSE 'privato' END, NULL, NULL
-- FROM storage.buckets WHERE id = 'materiali'
-- ORDER BY 1, 2;
