-- Aggiunge la colonna citta alla tabella profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS citta text;
