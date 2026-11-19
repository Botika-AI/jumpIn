-- ============================================================
-- RIPRISTINO di fase2_voce1_scansione_valida.sql
-- ============================================================
-- Rimette la policy di inserimento com'era prima (19/11/2026).
-- ATTENZIONE: riapre le scansioni senza iscrizione e fuori dalle date.
-- ============================================================

BEGIN;

DROP POLICY "attendances_insert_own" ON public.attendances;

CREATE POLICY "attendances_insert_own" ON public.attendances
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMIT;
