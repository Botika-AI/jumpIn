-- ============================================================
-- Supporto al pannello "Profilo Studente" nell'area admin:
-- 1) feedback reali sugli eventi completati (prima era solo un
--    form finto lato studente, non salvava nulla)
-- 2) cancellazione definitiva di un singolo studente da admin
-- Eseguire in Supabase SQL Editor
-- ============================================================

-- 1. Feedback studenti sugli eventi
CREATE TABLE IF NOT EXISTS public.feedback_eventi (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      text        NOT NULL REFERENCES public.events(id)  ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating        int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  positivo      text,
  miglioramento text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.feedback_eventi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studente_inserisce_proprio_feedback" ON public.feedback_eventi;
DROP POLICY IF EXISTS "studente_legge_proprio_feedback"     ON public.feedback_eventi;
DROP POLICY IF EXISTS "admin_legge_feedback"                ON public.feedback_eventi;

CREATE POLICY "studente_inserisce_proprio_feedback" ON public.feedback_eventi
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "studente_legge_proprio_feedback" ON public.feedback_eventi
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin_legge_feedback" ON public.feedback_eventi
  FOR SELECT TO authenticated
  USING (auth_is_admin());

-- 2. RPC: cancellazione definitiva di uno studente (solo admin).
--    profiles.id → auth.users ON DELETE CASCADE, quindi elimina
--    automaticamente anche tutte le tabelle collegate (attendances,
--    iscrizioni_eventi, badge_assegnazioni, notifiche, feedback_eventi,
--    saved_profiles, company_contacts, job_applications, access_logs,
--    certificati_assegnazioni).
CREATE OR REPLACE FUNCTION public.admin_delete_student(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT auth_is_admin() THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
