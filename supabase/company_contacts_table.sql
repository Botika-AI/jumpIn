-- ============================================================
-- Tabella dedicata per tracciare i profili contattati dall'azienda
-- Sostituisce il conteggio basato su notifiche (tipo=messaggio_azienda)
-- Eseguire in Supabase SQL Editor
-- ============================================================

-- 1. Tabella company_contacts: una riga per ogni contatto inviato
CREATE TABLE IF NOT EXISTS public.company_contacts (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid        NOT NULL REFERENCES public.aziende(id)  ON DELETE CASCADE,
  student_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_company_contacts" ON public.company_contacts;
DROP POLICY IF EXISTS "auth_company_contacts" ON public.company_contacts;
CREATE POLICY "anon_company_contacts" ON public.company_contacts FOR ALL TO anon        USING (true) WITH CHECK (true);
CREATE POLICY "auth_company_contacts" ON public.company_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. RPC contact_student: scrive sia la notifica in-app allo studente
--    sia la riga di tracciamento in company_contacts
CREATE OR REPLACE FUNCTION public.contact_student(
  p_company_id   uuid,
  p_company_name text,
  p_student_id   uuid,
  p_message      text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifiche(user_id, tipo, titolo, corpo, riferimento_id)
  VALUES(
    p_student_id,
    'messaggio_azienda',
    'Messaggio da ' || p_company_name,
    p_message,
    p_company_id::text
  );

  INSERT INTO public.company_contacts(company_id, student_id, message)
  VALUES(p_company_id, p_student_id, p_message);
END;
$$;

-- 3. RPC statistiche: conta i profili contattati da company_contacts
CREATE OR REPLACE FUNCTION public.get_company_dashboard_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_saved_now      bigint;
  v_saved_30ago    bigint;
  v_interested     bigint;
  v_interested_wk  bigint;
  v_contacted      bigint;
  v_contacted_wk   bigint;
BEGIN
  SELECT COUNT(*)                   INTO v_saved_now     FROM saved_profiles    WHERE company_id = p_company_id;
  SELECT COUNT(*)                   INTO v_saved_30ago   FROM saved_profiles    WHERE company_id = p_company_id AND created_at <= now() - interval '30 days';
  SELECT COUNT(DISTINCT student_id) INTO v_interested    FROM company_interests WHERE company_id = p_company_id;
  SELECT COUNT(DISTINCT student_id) INTO v_interested_wk FROM company_interests WHERE company_id = p_company_id AND created_at >= now() - interval '7 days';

  SELECT COUNT(DISTINCT student_id) INTO v_contacted
  FROM company_contacts
  WHERE company_id = p_company_id;

  SELECT COUNT(DISTINCT student_id) INTO v_contacted_wk
  FROM company_contacts
  WHERE company_id = p_company_id AND created_at >= now() - interval '7 days';

  RETURN jsonb_build_object(
    'saved_now',        v_saved_now,
    'saved_delta',      v_saved_now - v_saved_30ago,
    'interested_total', v_interested,
    'interested_week',  v_interested_wk,
    'contacted_total',  v_contacted,
    'contacted_week',   v_contacted_wk
  );
END;
$$;

-- 4. Escludi dai profili suggeriti chi è già stato contattato
--    (prima si basava su notifiche, ora su company_contacts)
--    DROP necessario: cambia le colonne di ritorno (aggiunta "citta"), CREATE OR REPLACE non basta
DROP FUNCTION IF EXISTS public.get_suggested_profiles(uuid, int);
CREATE OR REPLACE FUNCTION public.get_suggested_profiles(p_company_id uuid, p_limit int DEFAULT 6)
RETURNS TABLE(
  id          uuid,
  first_name  text,
  last_name   text,
  email       text,
  school      text,
  dob         text,
  citta       text,
  bio         text,
  interests   text[],
  badge_count bigint,
  event_count bigint
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
      p.last_checkin
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
      AND p.id NOT IN (
        SELECT student_id FROM public.saved_profiles WHERE company_id = p_company_id
      )
      AND p.id NOT IN (
        SELECT student_id FROM public.company_contacts WHERE company_id = p_company_id
      )
    GROUP BY p.id, p.first_name, p.last_name, p.email, p.school,
             p.dob, p.bio, p.interests, p.citta, p.last_checkin
  )
  SELECT
    b.id, b.first_name, b.last_name, b.email, b.school,
    b.dob, b.student_citta, b.bio, b.interests, b.badge_count, b.event_count
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
  b.last_checkin DESC NULLS LAST
  LIMIT p_limit;
END;
$$;
