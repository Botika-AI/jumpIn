-- =====================================================================
-- SICUREZZA — FASE 1 (problemi A, B, C)          preparato il 18/11/2026
-- Eseguire PRIMA su Development, poi su Production.
-- Tutto o niente: se un comando fallisce, nessuna modifica viene applicata.
-- Ripristino: sicurezza_fase1_ripristino.sql
-- Non modifica né cancella dati: cambia solo permessi, regole e funzioni.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- A. Lo studente non può più diventare admin da solo
-- ---------------------------------------------------------------------

-- A1. Lista dei campi modificabili (tutto il resto è bloccato, is_admin compreso).
--     Campi usati dall'app: ProfileSettingsPage, onboarding (App.tsx), scansione QR,
--     StudenteModal (admin: school, dob).
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (first_name, last_name, school, dob, bio, citta, interests, goals,
              profile_completed_at, last_checkin)
  ON public.profiles TO authenticated;

-- A2. Seconda protezione: nessuna richiesta dall'app può cambiare is_admin,
--     anche se un domani la lista sopra venisse allargata per errore.
--     Dal SQL Editor (utente postgres) gli admin si nominano come sempre.
CREATE OR REPLACE FUNCTION public.profiles_proteggi_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND (
       (TG_OP = 'INSERT' AND NEW.is_admin IS TRUE)
    OR (TG_OP = 'UPDATE' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin)
  ) THEN
    RAISE EXCEPTION 'Modifica di is_admin non consentita' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_proteggi_is_admin ON public.profiles;
CREATE TRIGGER profiles_proteggi_is_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_proteggi_is_admin();

-- ---------------------------------------------------------------------
-- B. Lo studente non può più accettarsi da solo l'iscrizione
--    Prima: una sola regola "lo studente può fare tutto sulle proprie iscrizioni".
--    Dopo: legge le proprie, le crea solo "in_attesa", annulla solo se non rifiutate.
--    Nessuna regola di modifica per lo studente. La regola admin resta invariata.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Studenti gestiscono proprie iscrizioni" ON public.iscrizioni_eventi;

DROP POLICY IF EXISTS iscrizioni_select_own ON public.iscrizioni_eventi;
CREATE POLICY iscrizioni_select_own ON public.iscrizioni_eventi
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS iscrizioni_insert_own ON public.iscrizioni_eventi;
CREATE POLICY iscrizioni_insert_own ON public.iscrizioni_eventi
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND stato = 'in_attesa');

DROP POLICY IF EXISTS iscrizioni_delete_own ON public.iscrizioni_eventi;
CREATE POLICY iscrizioni_delete_own ON public.iscrizioni_eventi
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND stato IN ('in_attesa', 'accettata'));

-- ---------------------------------------------------------------------
-- C. Chiusura del portale aziende (non usato) e funzioni esposte
-- ---------------------------------------------------------------------

-- C1. Funzioni del portale: nessuno può più chiamarle dall'app.
--     Si toglie il permesso anche a PUBLIC ("tutti"), altrimenti anon lo riprende da lì.
REVOKE EXECUTE ON FUNCTION
  public.contact_student(uuid, text, uuid, text),
  public.get_all_talent_profiles(uuid),
  public.get_company_dashboard_stats(uuid),
  public.get_published_events_for_company(uuid),
  public.get_suggested_profiles(uuid, integer),
  public.request_event_sponsorship(uuid, text, text, text, text),
  public.toggle_save_profile(uuid, uuid),
  public.update_azienda_referente(uuid, text, text, text),
  public.verify_azienda_login(text, text, text)
FROM PUBLIC, anon, authenticated;

-- C2. admin_delete_student: ha già il controllo admin; si toglie solo agli anonimi.
REVOKE EXECUTE ON FUNCTION public.admin_delete_student(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_delete_student(uuid) TO authenticated;

-- C3. notify_profile_completed: ognuno può creare la notifica solo per sé stesso.
CREATE OR REPLACE FUNCTION public.notify_profile_completed(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifiche(user_id, tipo, titolo, corpo)
  VALUES (
    p_user_id,
    'profilo',
    'Profilo completato!',
    'Hai completato il tuo profilo. Ora scopri i nostri eventi e le nuove esperienze disponibili!'
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.notify_profile_completed(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.notify_profile_completed(uuid) TO authenticated;

-- C4. Tabelle del portale: via le regole "chiunque può fare tutto", solo l'admin.
--     Eccezione: lo studente legge i PROPRI interessi verso le aziende (AziendePage).
DROP POLICY IF EXISTS anon_company_contacts        ON public.company_contacts;
DROP POLICY IF EXISTS auth_company_contacts        ON public.company_contacts;
DROP POLICY IF EXISTS anon_company_interests       ON public.company_interests;
DROP POLICY IF EXISTS auth_company_interests       ON public.company_interests;
DROP POLICY IF EXISTS auth_company_searches        ON public.company_searches;
DROP POLICY IF EXISTS anon_saved_profiles          ON public.saved_profiles;
DROP POLICY IF EXISTS auth_saved_profiles          ON public.saved_profiles;
DROP POLICY IF EXISTS anon_sponsorizzazioni_eventi ON public.sponsorizzazioni_eventi;
DROP POLICY IF EXISTS auth_sponsorizzazioni_eventi ON public.sponsorizzazioni_eventi;

DROP POLICY IF EXISTS company_contacts_admin ON public.company_contacts;
CREATE POLICY company_contacts_admin ON public.company_contacts
  FOR ALL TO authenticated USING (public.auth_is_admin()) WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS company_interests_admin ON public.company_interests;
CREATE POLICY company_interests_admin ON public.company_interests
  FOR ALL TO authenticated USING (public.auth_is_admin()) WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS company_interests_select_own ON public.company_interests;
CREATE POLICY company_interests_select_own ON public.company_interests
  FOR SELECT TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS company_searches_admin ON public.company_searches;
CREATE POLICY company_searches_admin ON public.company_searches
  FOR ALL TO authenticated USING (public.auth_is_admin()) WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS saved_profiles_admin ON public.saved_profiles;
CREATE POLICY saved_profiles_admin ON public.saved_profiles
  FOR ALL TO authenticated USING (public.auth_is_admin()) WITH CHECK (public.auth_is_admin());

DROP POLICY IF EXISTS sponsorizzazioni_eventi_admin ON public.sponsorizzazioni_eventi;
CREATE POLICY sponsorizzazioni_eventi_admin ON public.sponsorizzazioni_eventi
  FOR ALL TO authenticated USING (public.auth_is_admin()) WITH CHECK (public.auth_is_admin());

COMMIT;

-- ---------------------------------------------------------------------
-- Verifica (sola lettura): eseguire dopo il COMMIT e confrontare con l'atteso
-- ---------------------------------------------------------------------
SELECT 'A: anon/authenticated possono modificare is_admin?' AS controllo,
       (has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'UPDATE')
        OR has_column_privilege('anon', 'public.profiles', 'is_admin', 'UPDATE'))::text AS valore,
       'false' AS atteso
UNION ALL
SELECT 'A: trigger di protezione presente',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_proteggi_is_admin')::text, 'true'
UNION ALL
SELECT 'B: policy studente su iscrizioni',
       string_agg(policyname || ':' || cmd, ', ' ORDER BY policyname), 'iscrizioni_delete_own:DELETE, iscrizioni_insert_own:INSERT, iscrizioni_select_own:SELECT'
FROM pg_policies WHERE tablename = 'iscrizioni_eventi' AND policyname LIKE 'iscrizioni_%'
UNION ALL
SELECT 'C: anon può eseguire get_all_talent_profiles?',
       has_function_privilege('anon', 'public.get_all_talent_profiles(uuid)', 'EXECUTE')::text, 'false'
UNION ALL
SELECT 'C: studente può eseguire get_all_talent_profiles?',
       has_function_privilege('authenticated', 'public.get_all_talent_profiles(uuid)', 'EXECUTE')::text, 'false'
UNION ALL
SELECT 'C: policy con USING (true) sulle tabelle del portale',
       count(*)::text, '0'
FROM pg_policies
WHERE tablename IN ('company_contacts','company_interests','company_searches','saved_profiles','sponsorizzazioni_eventi')
  AND qual = 'true';
