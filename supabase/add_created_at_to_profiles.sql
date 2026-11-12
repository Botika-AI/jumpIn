-- ============================================================
-- Aggiunge created_at a profiles, per poter mostrare solo le
-- notifiche pubblicate dal momento in cui lo studente si è iscritto.
-- Eseguire in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
