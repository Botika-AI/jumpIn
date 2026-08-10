-- Tabella badges
CREATE TABLE IF NOT EXISTS public.badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  descrizione text,
  icona_url   text,
  categoria   text,
  visibilita  text NOT NULL DEFAULT 'studenti'
                CHECK (visibilita IN ('studenti', 'interno', 'bozza')),
  tags        text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Tabella assegnazioni badge → utenti
CREATE TABLE IF NOT EXISTS public.badge_assegnazioni (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id     uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assegnato_da uuid REFERENCES public.profiles(id),
  assegnato_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (badge_id, user_id)
);

-- RLS badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_read_authenticated"
  ON public.badges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "badges_write_admin"
  ON public.badges FOR ALL
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- RLS badge_assegnazioni
ALTER TABLE public.badge_assegnazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badge_assegnazioni_read_own_or_admin"
  ON public.badge_assegnazioni FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR auth_is_admin());

CREATE POLICY "badge_assegnazioni_write_admin"
  ON public.badge_assegnazioni FOR ALL
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());
