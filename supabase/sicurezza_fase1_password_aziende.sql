-- =====================================================================
-- SICUREZZA — FASE 1 (problema E): svuotamento password aziende   18/11/2026
-- Le password del portale aziende erano salvate in chiaro e leggibili dagli
-- studenti. Il portale è disattivato (Fase 1, C): le password non servono.
-- ⚠️ IRREVERSIBILE: le password vengono perse. Decisione dell'utente (Q29).
-- Da eseguire PER ULTIMO, dopo sicurezza_fase1.sql.
-- =====================================================================

-- 1. Prima (sola lettura): quante password verranno svuotate
SELECT count(*) FILTER (WHERE password_temp IS NOT NULL) AS da_svuotare FROM public.aziende;

-- 2. Svuotamento
BEGIN;
UPDATE public.aziende SET password_temp = NULL WHERE password_temp IS NOT NULL;
COMMIT;

-- 3. Dopo (sola lettura) — atteso: 0
SELECT count(*) FILTER (WHERE password_temp IS NOT NULL) AS rimaste FROM public.aziende;
