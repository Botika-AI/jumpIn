-- ============================================================
-- Sezione "Esperienze" nel portale azienda: sfoglia gli eventi
-- pubblicati e richiedi di diventare sponsor/partner.
-- Eseguire in Supabase SQL Editor
-- ============================================================

-- 0. Colonna usata nel codice ma mai migrata (era stata aggiunta a mano)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS breve_descrizione text;

-- 1. Richieste di sponsorizzazione azienda → evento
CREATE TABLE IF NOT EXISTS public.sponsorizzazioni_eventi (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   text        NOT NULL REFERENCES public.events(id)  ON DELETE CASCADE,
  azienda_id uuid        NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  referente  text,
  email      text,
  messaggio  text,
  stato      text        NOT NULL DEFAULT 'in_attesa',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, azienda_id)
);
ALTER TABLE public.sponsorizzazioni_eventi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_sponsorizzazioni_eventi" ON public.sponsorizzazioni_eventi;
DROP POLICY IF EXISTS "auth_sponsorizzazioni_eventi" ON public.sponsorizzazioni_eventi;
CREATE POLICY "anon_sponsorizzazioni_eventi" ON public.sponsorizzazioni_eventi FOR ALL TO anon        USING (true) WITH CHECK (true);
CREATE POLICY "auth_sponsorizzazioni_eventi" ON public.sponsorizzazioni_eventi FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. RPC: eventi pubblicati + flag "richiesta già inviata" per questa azienda
--    (events non ha policy anon, quindi il portale azienda deve passare da qui)
CREATE OR REPLACE FUNCTION public.get_published_events_for_company(p_company_id uuid)
RETURNS TABLE(
  id                   text,
  name                 text,
  breve_descrizione    text,
  descrizione          text,
  event_date           date,
  event_end            date,
  location             text,
  logo_url             text,
  cover_url            text,
  modalita             text,
  tags                 text[],
  max_partecipanti     int,
  cosa_impari          text[],
  requisiti            text,
  is_sponsor_requested boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id, e.name, e.breve_descrizione, e.descrizione, e.event_date, e.event_end, e.location,
    e.logo_url, e.cover_url, e.modalita, COALESCE(e.tags, '{}'), e.max_partecipanti,
    COALESCE(e.cosa_impari, '{}'), e.requisiti,
    EXISTS(
      SELECT 1 FROM public.sponsorizzazioni_eventi se
      WHERE se.event_id = e.id AND se.azienda_id = p_company_id
    ) AS is_sponsor_requested
  FROM public.events e
  WHERE e.stato = 'pubblicato'
  ORDER BY e.event_date ASC;
END;
$$;

-- 3. RPC: invia (o aggiorna) la richiesta di sponsorizzazione
CREATE OR REPLACE FUNCTION public.request_event_sponsorship(
  p_company_id uuid,
  p_event_id   text,
  p_referente  text,
  p_email      text,
  p_messaggio  text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sponsorizzazioni_eventi(event_id, azienda_id, referente, email, messaggio)
  VALUES (p_event_id, p_company_id, p_referente, p_email, p_messaggio)
  ON CONFLICT (event_id, azienda_id) DO UPDATE
    SET referente  = EXCLUDED.referente,
        email      = EXCLUDED.email,
        messaggio  = EXCLUDED.messaggio,
        created_at = now();
END;
$$;
