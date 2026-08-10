-- ============================================================
-- Azienda Dashboard — nuove tabelle + funzioni RPC
-- Eseguire in Supabase SQL Editor
-- ============================================================

-- 1. Aggiunge user_id (targeted) alla tabella notifiche
--    null = broadcast a tutti, non-null = notifica diretta a uno studente
ALTER TABLE public.notifiche ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Aggiorna RLS notifiche: studente vede le broadcast + le proprie targeted
DROP POLICY IF EXISTS "Autenticati leggono notifiche" ON public.notifiche;
CREATE POLICY "Autenticati leggono notifiche" ON public.notifiche
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- 2. Profili salvati dall'azienda
CREATE TABLE IF NOT EXISTS public.saved_profiles (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid        NOT NULL REFERENCES public.aziende(id)  ON DELETE CASCADE,
  student_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, student_id)
);
ALTER TABLE public.saved_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_saved_profiles"  ON public.saved_profiles FOR ALL TO anon        USING (true) WITH CHECK (true);
CREATE POLICY "auth_saved_profiles"  ON public.saved_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Studenti che hanno espresso interesse per un'azienda
--    (populate quando si aggiunge il bottone "Mi interessa" lato studente)
CREATE TABLE IF NOT EXISTS public.company_interests (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid        NOT NULL REFERENCES public.aziende(id)  ON DELETE CASCADE,
  student_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, student_id)
);
ALTER TABLE public.company_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_company_interests" ON public.company_interests FOR ALL TO anon        USING (true) WITH CHECK (true);
CREATE POLICY "auth_company_interests" ON public.company_interests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Ricerche effettuate dall'azienda (populate dalla sezione "Talenti di Domani")
CREATE TABLE IF NOT EXISTS public.company_searches (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid        NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  query      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_company_searches" ON public.company_searches FOR ALL TO anon        USING (true) WITH CHECK (true);
CREATE POLICY "auth_company_searches" ON public.company_searches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. RPC: statistiche dashboard (bypassa RLS, sicura: nessun dato esposto)
CREATE OR REPLACE FUNCTION public.get_company_dashboard_stats(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_saved_now     bigint;
  v_saved_30ago   bigint;
  v_interested    bigint;
  v_interested_wk bigint;
  v_searches_wk   bigint;
BEGIN
  SELECT COUNT(*)             INTO v_saved_now     FROM saved_profiles    WHERE company_id = p_company_id;
  SELECT COUNT(*)             INTO v_saved_30ago   FROM saved_profiles    WHERE company_id = p_company_id AND created_at <= now() - interval '30 days';
  SELECT COUNT(DISTINCT student_id) INTO v_interested    FROM company_interests WHERE company_id = p_company_id;
  SELECT COUNT(DISTINCT student_id) INTO v_interested_wk FROM company_interests WHERE company_id = p_company_id AND created_at >= now() - interval '7 days';
  SELECT COUNT(*)             INTO v_searches_wk   FROM company_searches  WHERE company_id = p_company_id AND created_at >= now() - interval '7 days';

  RETURN jsonb_build_object(
    'saved_now',        v_saved_now,
    'saved_delta',      v_saved_now - v_saved_30ago,
    'interested_total', v_interested,
    'interested_week',  v_interested_wk,
    'searches_week',    v_searches_wk
  );
END;
$$;

-- 6. RPC: profili suggeriti con matchScore
--    matchScore = (interest_overlap × 3) + (badge_count × 1) + (event_count × 1) + (location_match × 2)
--    event_count = solo eventi CONCLUSI con almeno un check-in QR (attendances type='ingresso')
CREATE OR REPLACE FUNCTION public.get_suggested_profiles(p_company_id uuid, p_limit int DEFAULT 6)
RETURNS TABLE(
  id          uuid,
  first_name  text,
  last_name   text,
  email       text,
  school      text,
  dob         text,
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
        SELECT n.user_id FROM public.notifiche n
        WHERE n.riferimento_id = p_company_id::text
          AND n.tipo = 'messaggio_azienda'
          AND n.user_id IS NOT NULL
      )
    GROUP BY p.id, p.first_name, p.last_name, p.email, p.school,
             p.dob, p.bio, p.interests, p.citta, p.last_checkin
  )
  SELECT
    b.id, b.first_name, b.last_name, b.email, b.school,
    b.dob, b.bio, b.interests, b.badge_count, b.event_count
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

-- 7. RPC: salva / rimuovi profilo (toggle)
--    Restituisce TRUE se ora è salvato, FALSE se è stato rimosso
CREATE OR REPLACE FUNCTION public.toggle_save_profile(p_company_id uuid, p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.saved_profiles
    WHERE company_id = p_company_id AND student_id = p_student_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.saved_profiles
    WHERE company_id = p_company_id AND student_id = p_student_id;
    RETURN false;
  ELSE
    INSERT INTO public.saved_profiles(company_id, student_id)
    VALUES(p_company_id, p_student_id);
    RETURN true;
  END IF;
END;
$$;

-- 8. RPC: invia messaggio/notifica in-app a uno studente
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
END;
$$;
