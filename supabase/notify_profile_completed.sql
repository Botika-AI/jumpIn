-- ============================================================
-- RPC: invia la notifica "Profilo completato" allo studente.
-- Necessaria perché la RLS su notifiche permette INSERT solo
-- all'admin (auth_is_admin()) — questa funzione bypassa la RLS
-- inserendo solo il contenuto fisso previsto, non testo arbitrario.
-- Eseguire in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_profile_completed(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifiche(user_id, tipo, titolo, corpo)
  VALUES (
    p_user_id,
    'profilo',
    'Profilo completato!',
    'Hai completato il tuo profilo. Ora scopri i nostri eventi e le nuove esperienze disponibili!'
  );
END;
$$;
