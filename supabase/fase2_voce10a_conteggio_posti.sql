-- ============================================================
-- Fase 2 / voce 10a — Conteggio posti senza nomi (Q28)
-- ============================================================
-- Development E Production. Da applicare SUBITO: è un'aggiunta,
-- il codice attuale non la usa e non se ne accorge.
--
-- Crea posti_accettati(): per ogni Evento pubblicato restituisce
-- solo il numero di Iscrizioni accettate, senza sapere chi sono.
-- Sostituirà, nel codice di EsperienzePage e HomeDashboard, la lettura
-- diretta di iscrizioni_eventi (stato = 'accettata'), che oggi è
-- possibile per la policy "Tutti leggono iscrizioni accettate per
-- conteggio posti" e mostra a ogni studente chi partecipa.
--
-- La policy si toglie con fase2_voce10b_togli_lettura_accettate.sql,
-- SOLO DOPO che il nuovo codice è online.
--
-- Ripristino: DROP FUNCTION public.posti_accettati();
-- ============================================================

BEGIN;

CREATE FUNCTION public.posti_accettati()
RETURNS TABLE (event_id text, accettate integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT i.event_id, count(*)::integer
  FROM public.iscrizioni_eventi i
  JOIN public.events e ON e.id = i.event_id
  WHERE i.stato = 'accettata'
    AND (e.stato = 'pubblicato' OR public.auth_is_admin())
  GROUP BY i.event_id;
$$;

REVOKE EXECUTE ON FUNCTION public.posti_accettati() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.posti_accettati() TO authenticated;

COMMIT;


-- ============================================================
-- Verifica (sola lettura): eseguire dopo il COMMIT
-- Atteso: definer = true; proacl con authenticated=X, senza anon e senza "=X"
-- (poi la funzione stessa: una riga per evento con accettate)
-- ============================================================
-- SELECT proname, prosecdef AS definer, proconfig, proacl
-- FROM pg_proc WHERE proname = 'posti_accettati';
-- SELECT * FROM public.posti_accettati();
