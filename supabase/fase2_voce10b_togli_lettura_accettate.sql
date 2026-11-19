-- ============================================================
-- Fase 2 / voce 10b — Togliere la lettura delle iscrizioni altrui (Q28)
-- ============================================================
-- ⚠️ DA APPLICARE SOLO DOPO che il codice che usa posti_accettati()
--    (EsperienzePage, HomeDashboard) è online in quell'ambiente:
--    - Development: dopo aver aggiornato il codice sul branch;
--    - Production: subito dopo il merge su main e il deploy di Vercel.
--    Applicato prima, il sito mostrerebbe sempre 0 posti occupati.
--
-- Dopo questo script uno studente legge solo le proprie Iscrizioni.
--
-- Policy tolta (uguale su Dev e Prod, 19/11/2026):
--   "Tutti leggono iscrizioni accettate per conteggio posti"
--   SELECT {authenticated} USING (stato = 'accettata')
--
-- Ripristino (in fondo al file, commentato).
-- ============================================================

BEGIN;

DROP POLICY "Tutti leggono iscrizioni accettate per conteggio posti" ON public.iscrizioni_eventi;

COMMIT;


-- ============================================================
-- Verifica (sola lettura): eseguire dopo il COMMIT
-- Atteso: 4 policy, senza "Tutti leggono iscrizioni accettate..."
-- ============================================================
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'iscrizioni_eventi' ORDER BY policyname;


-- ============================================================
-- RIPRISTINO
-- ============================================================
-- CREATE POLICY "Tutti leggono iscrizioni accettate per conteggio posti"
--   ON public.iscrizioni_eventi FOR SELECT TO authenticated
--   USING (stato = 'accettata');
