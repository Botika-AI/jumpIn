-- Conta studenti idonei al badge "3 eventi conclusi"
-- Sicura: SECURITY DEFINER + nessun parametro sensibile
CREATE OR REPLACE FUNCTION count_badge_eligible_students(p_min_events integer DEFAULT 3)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer FROM (
    SELECT a.user_id
    FROM attendances a
    JOIN events e ON e.id = a.event_id
    WHERE (
      e.event_end < CURRENT_DATE
      OR (e.event_end IS NULL AND e.event_date < CURRENT_DATE)
    )
    GROUP BY a.user_id
    HAVING COUNT(DISTINCT a.event_id) >= p_min_events
  ) sub;
$$;

-- Assegna il badge a tutti gli studenti idonei
-- Sicura: verifica admin server-side, aggregazione SQL, ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION assign_badge_by_event_threshold(
  p_badge_id uuid,
  p_min_events integer DEFAULT 3
)
RETURNS integer  -- numero di nuovi assegnati (già-assegnati esclusi)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count integer;
BEGIN
  IF NOT auth_is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  WITH qualified AS (
    SELECT a.user_id
    FROM attendances a
    JOIN events e ON e.id = a.event_id
    WHERE (
      e.event_end < CURRENT_DATE
      OR (e.event_end IS NULL AND e.event_date < CURRENT_DATE)
    )
    GROUP BY a.user_id
    HAVING COUNT(DISTINCT a.event_id) >= p_min_events
  ),
  inserted AS (
    INSERT INTO badge_assegnazioni (badge_id, user_id, assegnato_da)
    SELECT p_badge_id, q.user_id, auth.uid()
    FROM qualified q
    ON CONFLICT (badge_id, user_id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_new_count FROM inserted;

  RETURN v_new_count;
END;
$$;
