-- ============================================================
-- Traccia il momento in cui lo studente completa il profilo per la
-- prima volta (bio + città + almeno un interesse), per mostrare
-- l'attività "Profilo completato" nella tab Attività.
-- Eseguire in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;
