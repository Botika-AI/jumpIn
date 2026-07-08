-- Aggiunge la colonna bio alla tabella profiles
-- Max 160 caratteri gestito lato client (nessun vincolo DB per flessibilità)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- La colonna interests è già presente come text[] nel tipo TypeScript.
-- Se non esiste ancora nel DB, aggiungerla:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
