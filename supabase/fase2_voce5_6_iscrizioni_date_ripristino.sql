-- ============================================================
-- RIPRISTINO di fase2_voce5_6_iscrizioni_date.sql
-- ============================================================
-- Rimette le due policy com'erano dopo la Fase 1 (19/11/2026):
-- iscrizione e annullamento senza limiti di data.
-- ============================================================

BEGIN;

DROP POLICY "iscrizioni_insert_own" ON public.iscrizioni_eventi;
CREATE POLICY "iscrizioni_insert_own" ON public.iscrizioni_eventi
  FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND (stato = 'in_attesa'));

DROP POLICY "iscrizioni_delete_own" ON public.iscrizioni_eventi;
CREATE POLICY "iscrizioni_delete_own" ON public.iscrizioni_eventi
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id) AND (stato = ANY (ARRAY['in_attesa'::text, 'accettata'::text])));

COMMIT;
