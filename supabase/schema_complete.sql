-- ============================================================
-- JumpIn QR Check-In: Schema Completo (Production → Development)
-- Esegui questo file nel SQL Editor del progetto Development.
-- Include tutte le migrazioni applicate in Production.
-- ============================================================

-- ============================================================
-- 1. TABELLE
-- ============================================================

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid         REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name  text,
  last_name   text,
  email       text         NOT NULL,
  school      text,
  dob         text,
  last_checkin timestamptz,
  is_admin    boolean      NOT NULL DEFAULT false
);

-- events
CREATE TABLE IF NOT EXISTS public.events (
  id          text         PRIMARY KEY,
  name        text         NOT NULL,
  event_date  date,
  event_end   date,
  location    text,
  created_at  timestamptz  DEFAULT now()
);

-- attendances
CREATE TABLE IF NOT EXISTS public.attendances (
  id          uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid         REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id    text         REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  type        text         CHECK (type IN ('ingresso', 'uscita')) NOT NULL,
  scanned_at  timestamptz  DEFAULT now()
);

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. FUNZIONE ADMIN (SECURITY DEFINER — evita recursione RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$;

-- ============================================================
-- 4. POLICY — profiles
-- ============================================================

DROP POLICY IF EXISTS "Users can view own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"     ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin"            ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"              ON public.profiles;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR auth_is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 5. POLICY — events
-- ============================================================

DROP POLICY IF EXISTS "Events readable by authenticated" ON public.events;
DROP POLICY IF EXISTS "events_select_authenticated"      ON public.events;
DROP POLICY IF EXISTS "events_insert_admin"              ON public.events;
DROP POLICY IF EXISTS "events_update_admin"              ON public.events;
DROP POLICY IF EXISTS "events_delete_admin"              ON public.events;

CREATE POLICY "events_select_authenticated" ON public.events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "events_insert_admin" ON public.events
  FOR INSERT TO authenticated WITH CHECK (auth_is_admin());

CREATE POLICY "events_update_admin" ON public.events
  FOR UPDATE TO authenticated USING (auth_is_admin());

-- ============================================================
-- 6. POLICY — attendances
-- ============================================================

DROP POLICY IF EXISTS "Users can insert own attendance"      ON public.attendances;
DROP POLICY IF EXISTS "Users can view own attendance"        ON public.attendances;
DROP POLICY IF EXISTS "attendances_select_admin"             ON public.attendances;
DROP POLICY IF EXISTS "attendances_insert_own"               ON public.attendances;
DROP POLICY IF EXISTS "attendances_select_own_or_admin"      ON public.attendances;

CREATE POLICY "attendances_insert_own" ON public.attendances
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "attendances_select_own_or_admin" ON public.attendances
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth_is_admin());

-- ============================================================
-- 7. TRIGGER — crea profilo automaticamente al signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, school, dob)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email,
    new.raw_user_meta_data ->> 'school',
    new.raw_user_meta_data ->> 'dob'
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name   = EXCLUDED.first_name,
    last_name    = EXCLUDED.last_name,
    email        = EXCLUDED.email,
    school       = EXCLUDED.school,
    dob          = EXCLUDED.dob;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 8. VIEW — profili con eventi (per export CSV)
-- ============================================================

CREATE OR REPLACE VIEW public.profiles_con_eventi AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  p.school,
  p.dob,
  p.last_checkin,
  p.is_admin,
  string_agg(DISTINCT e.id || ' – ' || e.name, ' | ') AS eventi_partecipati
FROM public.profiles p
INNER JOIN public.attendances a ON a.user_id = p.id
INNER JOIN public.events e ON e.id = a.event_id
GROUP BY p.id, p.first_name, p.last_name, p.email, p.school, p.dob, p.last_checkin, p.is_admin;
