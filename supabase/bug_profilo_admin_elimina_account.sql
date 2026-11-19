-- ============================================================
-- Bug: modifica profilo da admin + eliminazione account studente
-- ============================================================
-- Development E Production.
--
-- 1. L'admin modifica il profilo di uno studente (StudenteModal).
--    Prima esisteva solo "profiles_update_own": l'UPDATE dell'admin
--    aggiornava 0 righe senza errore. Nuova policy profiles_update_admin.
--    Le colonne modificabili restano quelle autorizzate dalla Fase 1
--    (first_name, last_name, school, dob, bio, citta, interests, goals,
--    profile_completed_at, last_checkin): is_admin resta protetto.
--
-- 2. Lo studente elimina il proprio account (ProfileSettingsPage chiama
--    la RPC delete_user, che non esisteva).
--    delete_user(): nessun parametro, cancella SOLO l'account di chi la
--    chiama (auth.uid()). Rifiutata agli admin (per non restare senza
--    admin per sbaglio) e agli anonimi.
--    auth.users → profiles → tutte le tabelle collegate: ON DELETE CASCADE
--    (verificato su Dev e Prod il 19/11/2026).
--
-- Ripristino: bug_profilo_admin_elimina_account_ripristino.sql
-- ============================================================

BEGIN;

-- ── 1 ────────────────────────────────────────────────────────
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.auth_is_admin())
  WITH CHECK (public.auth_is_admin());

-- ── 2 ────────────────────────────────────────────────────────
CREATE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501';
  END IF;
  IF public.auth_is_admin() THEN
    RAISE EXCEPTION 'Un account admin non si elimina da qui' USING ERRCODE = '42501';
  END IF;

  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delete_user() TO authenticated;

COMMIT;


-- ============================================================
-- Verifica (sola lettura): eseguire dopo il COMMIT
-- Atteso: profiles_update_admin presente; delete_user definer=true,
-- proacl con authenticated=X, senza anon e senza "=X"
-- ============================================================
-- SELECT 'policy' AS tipo, policyname AS nome, cmd AS dettaglio
-- FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
-- UNION ALL
-- SELECT 'funzione', proname, prosecdef::text || ' ' || proacl::text
-- FROM pg_proc WHERE proname = 'delete_user'
-- ORDER BY 1, 2;
