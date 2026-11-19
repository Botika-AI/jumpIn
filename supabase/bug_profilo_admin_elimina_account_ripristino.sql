-- ============================================================
-- RIPRISTINO di bug_profilo_admin_elimina_account.sql
-- ============================================================
-- Toglie la modifica dei profili da admin e la funzione delete_user.
-- Gli account già eliminati NON tornano.
-- ============================================================

BEGIN;

DROP POLICY "profiles_update_admin" ON public.profiles;
DROP FUNCTION public.delete_user();

COMMIT;
