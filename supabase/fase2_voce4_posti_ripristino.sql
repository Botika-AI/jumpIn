-- ============================================================
-- RIPRISTINO di fase2_voce4_posti.sql
-- ============================================================
-- Toglie il controllo dei posti dal database: torna il solo controllo
-- (parziale) dell'interfaccia.
-- ============================================================

BEGIN;

DROP TRIGGER iscrizioni_controlla_posti ON public.iscrizioni_eventi;
DROP FUNCTION public.iscrizioni_controlla_posti();

COMMIT;
