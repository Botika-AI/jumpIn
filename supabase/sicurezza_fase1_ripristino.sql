-- =====================================================================
-- RIPRISTINO della SICUREZZA — FASE 1 (A, B, C)    preparato il 18/11/2026
-- Rimette permessi, regole e funzioni ESATTAMENTE come erano prima di
-- sicurezza_fase1.sql (definizioni prese dal backup di Production del 18/11/2026).
-- ATTENZIONE: riapre le vulnerabilità A, B, C. Usarlo solo se l'app smette
-- di funzionare dopo la Fase 1.
-- =====================================================================

BEGIN;

-- A. Profili: permesso di modifica su tutta la tabella, senza trigger
DROP TRIGGER IF EXISTS profiles_proteggi_is_admin ON public.profiles;
DROP FUNCTION IF EXISTS public.profiles_proteggi_is_admin();
REVOKE UPDATE (first_name, last_name, school, dob, bio, citta, interests, goals,
               profile_completed_at, last_checkin)
  ON public.profiles FROM authenticated;
GRANT UPDATE ON public.profiles TO anon, authenticated;

-- B. Iscrizioni: la regola unica originale
DROP POLICY IF EXISTS iscrizioni_select_own ON public.iscrizioni_eventi;
DROP POLICY IF EXISTS iscrizioni_insert_own ON public.iscrizioni_eventi;
DROP POLICY IF EXISTS iscrizioni_delete_own ON public.iscrizioni_eventi;
DROP POLICY IF EXISTS "Studenti gestiscono proprie iscrizioni" ON public.iscrizioni_eventi;
CREATE POLICY "Studenti gestiscono proprie iscrizioni" ON public.iscrizioni_eventi
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- C1-C2. Esecuzione delle funzioni di nuovo concessa a tutti
GRANT EXECUTE ON FUNCTION
  public.contact_student(uuid, text, uuid, text),
  public.get_all_talent_profiles(uuid),
  public.get_company_dashboard_stats(uuid),
  public.get_published_events_for_company(uuid),
  public.get_suggested_profiles(uuid, integer),
  public.request_event_sponsorship(uuid, text, text, text, text),
  public.toggle_save_profile(uuid, uuid),
  public.update_azienda_referente(uuid, text, text, text),
  public.verify_azienda_login(text, text, text),
  public.admin_delete_student(uuid),
  public.notify_profile_completed(uuid)
TO PUBLIC, anon, authenticated;

-- C3. notify_profile_completed: versione originale, senza controllo
CREATE OR REPLACE FUNCTION public.notify_profile_completed(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifiche(user_id, tipo, titolo, corpo)
  VALUES (
    p_user_id,
    'profilo',
    'Profilo completato!',
    'Hai completato il tuo profilo. Ora scopri i nostri eventi e le nuove esperienze disponibili!'
  );
END;
$function$;

-- C4. Tabelle del portale: regole originali
DROP POLICY IF EXISTS company_contacts_admin        ON public.company_contacts;
DROP POLICY IF EXISTS company_interests_admin       ON public.company_interests;
DROP POLICY IF EXISTS company_interests_select_own  ON public.company_interests;
DROP POLICY IF EXISTS company_searches_admin        ON public.company_searches;
DROP POLICY IF EXISTS saved_profiles_admin          ON public.saved_profiles;
DROP POLICY IF EXISTS sponsorizzazioni_eventi_admin ON public.sponsorizzazioni_eventi;

DROP POLICY IF EXISTS anon_company_contacts ON public.company_contacts;
CREATE POLICY anon_company_contacts ON public.company_contacts FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_company_contacts ON public.company_contacts;
CREATE POLICY auth_company_contacts ON public.company_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_company_interests ON public.company_interests;
CREATE POLICY anon_company_interests ON public.company_interests FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_company_interests ON public.company_interests;
CREATE POLICY auth_company_interests ON public.company_interests FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_company_searches ON public.company_searches;
CREATE POLICY auth_company_searches ON public.company_searches FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_saved_profiles ON public.saved_profiles;
CREATE POLICY anon_saved_profiles ON public.saved_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_saved_profiles ON public.saved_profiles;
CREATE POLICY auth_saved_profiles ON public.saved_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_sponsorizzazioni_eventi ON public.sponsorizzazioni_eventi;
CREATE POLICY anon_sponsorizzazioni_eventi ON public.sponsorizzazioni_eventi FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS auth_sponsorizzazioni_eventi ON public.sponsorizzazioni_eventi;
CREATE POLICY auth_sponsorizzazioni_eventi ON public.sponsorizzazioni_eventi FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
