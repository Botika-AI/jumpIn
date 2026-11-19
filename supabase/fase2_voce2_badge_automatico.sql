-- ============================================================
-- Fase 2 / voci 2 e 3 — Badge automatico (Q5, Q7)
-- ============================================================
-- ⏸ RINVIATO (19/11/2026): per ora i badge si assegnano solo a mano.
--    NON APPLICARE finché non si decide di attivare l'automatico
--    (vedi docs/da-definire.md, "Badge automatico").
-- ------------------------------------------------------------
-- Development E Production. Crea le due funzioni chiamate da
-- pages/admin/AssegnazioneBadge.tsx (mai create: badge_auto_rules.sql
-- non era stato applicato) con le regole del glossario:
--
--   Studente idoneo = profilo non admin con almeno N Partecipazioni
--   completate a Eventi pubblicati e conclusi.
--     - Partecipazione completata: Iscrizione accettata + almeno una
--       Scansione di ingresso e una di uscita, in qualsiasi ordine.
--     - Evento concluso: dal giorno dopo l'ultimo giorno (event_end,
--       oppure event_date se event_end è vuoto), in ORA ITALIANA.
--
-- Funzioni:
--   badge_studenti_idonei(p_min_events)        regola unica, interna:
--                                               nessuno può chiamarla dall'app
--   count_badge_eligible_students(p_min_events) solo admin: restituisce il numero
--   assign_badge_by_event_threshold(p_badge_id, p_min_events)
--                                               solo admin: assegna il badge,
--                                               restituisce i nuovi assegnati
-- I nomi dei parametri sono quelli usati dall'app: non cambiarli.
--
-- Ogni assegnazione genera la notifica "Hai ottenuto il badge"
-- (trigger già esistente su badge_assegnazioni).
--
-- Ripristino: fase2_voce2_badge_automatico_ripristino.sql
-- ============================================================

BEGIN;

-- Regola unica: chi ha almeno p_min_events Partecipazioni completate.
-- SECURITY INVOKER: eseguita con i permessi di chi la chiama. Le due
-- funzioni sotto sono SECURITY DEFINER, quindi la eseguono come proprietario.
CREATE FUNCTION public.badge_studenti_idonei(p_min_events integer)
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH completate AS (
    SELECT a.user_id, a.event_id
    FROM public.attendances a
    JOIN public.events e
      ON e.id = a.event_id
    JOIN public.iscrizioni_eventi i
      ON i.event_id = a.event_id AND i.user_id = a.user_id AND i.stato = 'accettata'
    JOIN public.profiles p
      ON p.id = a.user_id AND p.is_admin = false
    WHERE e.stato = 'pubblicato'
      AND COALESCE(e.event_end, e.event_date) < (now() AT TIME ZONE 'Europe/Rome')::date
    GROUP BY a.user_id, a.event_id
    HAVING bool_or(a.type = 'ingresso') AND bool_or(a.type = 'uscita')
  )
  SELECT c.user_id
  FROM completate c
  GROUP BY c.user_id
  HAVING count(*) >= p_min_events;
$$;

CREATE FUNCTION public.count_badge_eligible_students(p_min_events integer DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501';
  END IF;
  IF p_min_events IS NULL OR p_min_events < 1 THEN
    RAISE EXCEPTION 'Numero minimo di eventi non valido' USING ERRCODE = '22023';
  END IF;

  RETURN (SELECT count(*)::integer FROM public.badge_studenti_idonei(p_min_events));
END;
$$;

CREATE FUNCTION public.assign_badge_by_event_threshold(
  p_badge_id   uuid,
  p_min_events integer DEFAULT 3
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nuovi integer;
BEGIN
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501';
  END IF;
  IF p_min_events IS NULL OR p_min_events < 1 THEN
    RAISE EXCEPTION 'Numero minimo di eventi non valido' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.badge_assegnazioni (badge_id, user_id, assegnato_da)
  SELECT p_badge_id, s.user_id, auth.uid()
  FROM public.badge_studenti_idonei(p_min_events) s
  ON CONFLICT (badge_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_nuovi = ROW_COUNT;
  RETURN v_nuovi;
END;
$$;

-- Permessi. Supabase concede in automatico l'esecuzione ad anon e authenticated.
REVOKE EXECUTE ON FUNCTION public.badge_studenti_idonei(integer)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.count_badge_eligible_students(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.count_badge_eligible_students(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_badge_by_event_threshold(uuid, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.assign_badge_by_event_threshold(uuid, integer) TO authenticated;

COMMIT;


-- ============================================================
-- Verifica (sola lettura): eseguire dopo il COMMIT
-- Atteso: 3 righe;
--   badge_studenti_idonei          definer=false, acl senza anon/authenticated/PUBLIC (=X)
--   count_badge_eligible_students  definer=true,  acl con authenticated=X, senza anon e =X
--   assign_badge_by_event_threshold definer=true, acl con authenticated=X, senza anon e =X
-- ============================================================
-- SELECT p.proname, p.prosecdef AS definer, p.proconfig, p.proacl
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('badge_studenti_idonei', 'count_badge_eligible_students',
--                     'assign_badge_by_event_threshold')
-- ORDER BY p.proname;
