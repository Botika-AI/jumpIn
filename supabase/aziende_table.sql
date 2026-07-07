-- Tabella aziende
-- Le aziende si registrano tramite la loro sezione dedicata dell'app
-- e vengono poi mostrate agli studenti nella sezione Aziende.
CREATE TABLE public.aziende (
  id          text        PRIMARY KEY,
  name        text        NOT NULL,
  sector      text,
  description text,
  logo_url    text,
  website     text,
  email       text,
  location    text,
  created_at  timestamptz DEFAULT now()
);

-- RLS: tutti gli utenti autenticati possono leggere le aziende
ALTER TABLE public.aziende ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aziende visibili a tutti gli autenticati"
  ON public.aziende FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admin può inserire/modificare aziende"
  ON public.aziende FOR ALL
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());
