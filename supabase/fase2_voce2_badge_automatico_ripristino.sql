-- ============================================================
-- RIPRISTINO di fase2_voce2_badge_automatico.sql
-- ============================================================
-- Elimina le tre funzioni: si torna alla situazione precedente, in cui
-- non esistevano e il pannello "automatico" dei badge non funzionava.
-- Le assegnazioni di badge già fatte restano.
-- ============================================================

BEGIN;

DROP FUNCTION public.assign_badge_by_event_threshold(uuid, integer);
DROP FUNCTION public.count_badge_eligible_students(integer);
DROP FUNCTION public.badge_studenti_idonei(integer);

COMMIT;
