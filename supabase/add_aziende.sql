CREATE TABLE IF NOT EXISTS public.aziende (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Dati aziendali
  name            text        NOT NULL,
  partita_iva     text,
  settore         text,
  website         text,
  email           text,                          -- email di riferimento
  telefono        text,
  indirizzo       text,
  cap             text,
  provincia       text,
  description     text,
  logo_url        text,                          -- URL immagine logo (Supabase Storage)
  -- Account piattaforma
  email_account   text,                          -- email login futura
  mostra_partner  boolean     NOT NULL DEFAULT false,
  -- Stato
  piano           text        NOT NULL DEFAULT 'free',    -- 'free' | 'premium'
  stato           text        NOT NULL DEFAULT 'attivo',  -- 'attivo' | 'disattivo'
  last_access     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aziende ENABLE ROW LEVEL SECURITY;

-- Solo admin può leggere, inserire, modificare le aziende
CREATE POLICY "Admin gestisce aziende"
  ON public.aziende FOR ALL
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- Studenti autenticati possono leggere le aziende visibili (mostra_partner = true)
CREATE POLICY "Studenti leggono partner pubblici"
  ON public.aziende FOR SELECT
  USING (auth.role() = 'authenticated' AND mostra_partner = true AND stato = 'attivo');
