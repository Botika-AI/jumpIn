-- ============================================================
-- RPC dedicata alla sezione "Talenti di Domani": restituisce TUTTI
-- gli studenti (nessuna esclusione per salvati/contattati), con due
-- flag booleani is_saved / is_contacted per mostrare lo stato corretto
-- sul bottone in ProfileCard.
-- Eseguire in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_all_talent_profiles(p_company_id uuid)
RETURNS TABLE(
  id           uuid,
  first_name   text,
  last_name    text,
  email        text,
  school       text,
  dob          text,
  citta        text,
  bio          text,
  interests    text[],
  badge_count  bigint,
  event_count  bigint,
  is_saved     boolean,
  is_contacted boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_settore   text;
  v_citta     text;
  v_provincia text;
BEGIN
  SELECT a.settore, a.citta, a.provincia
  INTO v_settore, v_citta, v_provincia
  FROM public.aziende a
  WHERE a.id = p_company_id;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.email,
      p.school,
      p.dob,
      p.bio,
      COALESCE(p.interests, '{}')  AS interests,
      COUNT(DISTINCT ba.id)         AS badge_count,
      COUNT(DISTINCT att.event_id)  AS event_count,
      p.citta                       AS student_citta,
      p.last_checkin,
      EXISTS(
        SELECT 1 FROM public.saved_profiles sp
        WHERE sp.company_id = p_company_id AND sp.student_id = p.id
      ) AS is_saved,
      EXISTS(
        SELECT 1 FROM public.company_contacts cc
        WHERE cc.company_id = p_company_id AND cc.student_id = p.id
      ) AS is_contacted
    FROM public.profiles p
    LEFT JOIN public.badge_assegnazioni ba ON ba.user_id = p.id
    LEFT JOIN (
      SELECT a2.user_id, a2.event_id
      FROM public.attendances a2
      JOIN public.events ev ON ev.id = a2.event_id
      WHERE a2.type = 'ingresso'
        AND COALESCE(ev.event_end, ev.event_date)::date < current_date
    ) att ON att.user_id = p.id
    WHERE p.is_admin = false
    GROUP BY p.id, p.first_name, p.last_name, p.email, p.school,
             p.dob, p.bio, p.interests, p.citta, p.last_checkin
  )
  SELECT
    b.id, b.first_name, b.last_name, b.email, b.school,
    b.dob, b.student_citta, b.bio, b.interests, b.badge_count, b.event_count,
    b.is_saved, b.is_contacted
  FROM base b
  ORDER BY (
    (SELECT COUNT(*)::int
     FROM unnest(b.interests) AS t(interest)
     WHERE v_settore IS NOT NULL
       AND v_settore ILIKE '%' || t.interest || '%') * 3
    + b.badge_count::int
    + b.event_count::int
    + CASE
        WHEN v_citta IS NOT NULL AND b.student_citta IS NOT NULL
             AND LOWER(b.student_citta) = LOWER(v_citta)     THEN 2
        WHEN v_provincia IS NOT NULL AND b.student_citta IS NOT NULL
             AND LOWER(b.student_citta) = LOWER(v_provincia) THEN 2
        ELSE 0
      END
  ) DESC,
  b.last_checkin DESC NULLS LAST;
END;
$$;
