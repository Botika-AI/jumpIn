-- ============================================================
-- JumpIn - Admin Setup Migration
-- Già applicata via Supabase MCP. Conservata come riferimento.
-- ============================================================

-- 1. Aggiungi colonna is_admin alla tabella profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Funzione SECURITY DEFINER per check admin (evita recursione RLS)
CREATE OR REPLACE FUNCTION auth_is_admin()
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

-- 3. RLS events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_insert_admin" ON public.events FOR INSERT TO authenticated WITH CHECK (auth_is_admin());
CREATE POLICY "events_update_admin" ON public.events FOR UPDATE TO authenticated USING (auth_is_admin());

-- 4. attendances: utente vede le proprie OPPURE admin vede tutto
CREATE POLICY "attendances_select_admin" ON public.attendances FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth_is_admin());

-- 5. profiles: utente vede il proprio OPPURE admin vede tutto
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR auth_is_admin());

-- 6. Imposta admin per le email conosciute (eseguire dopo che gli utenti si sono registrati)
-- UPDATE public.profiles SET is_admin = true
--   WHERE email IN ('ciliberti.andrea@gmail.com', 'andrea.ciliberti@botika.ai');
