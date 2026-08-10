-- Colonne mancanti dalla tabella aziende (usate dall'UI ma mai aggiunte al DB)
ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS password_temp text;
ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS cover_url     text;
ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS citta         text;
ALTER TABLE public.aziende ADD COLUMN IF NOT EXISTS referente     text;

-- Funzione per verificare le credenziali di login aziendale.
-- SECURITY DEFINER: bypassa RLS, eseguita con i permessi del creatore.
-- Restituisce i dati dell'azienda solo se email_account + password_temp + name corrispondono
-- e lo stato è 'attivo'.
CREATE OR REPLACE FUNCTION public.verify_azienda_login(
  p_email    text,
  p_password text,
  p_name     text
)
RETURNS TABLE(
  id            uuid,
  name          text,
  email_account text,
  logo_url      text,
  description   text,
  stato         text,
  referente     text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.email_account,
    a.logo_url,
    a.description,
    a.stato,
    a.referente
  FROM public.aziende a
  WHERE LOWER(a.email_account) = LOWER(p_email)
    AND a.password_temp        = p_password
    AND LOWER(a.name)          = LOWER(p_name)
    AND a.stato                = 'attivo';
END;
$$;

-- Funzione per salvare il referente dopo il primo login.
-- Richiede le credenziali per sicurezza (solo chi conosce email+password può aggiornare).
CREATE OR REPLACE FUNCTION public.update_azienda_referente(
  p_id        uuid,
  p_referente text,
  p_email     text,
  p_password  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.aziende
  SET referente = p_referente
  WHERE id                       = p_id
    AND LOWER(email_account)     = LOWER(p_email)
    AND password_temp            = p_password;
END;
$$;
