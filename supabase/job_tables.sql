-- Tabella job_positions (offerte di lavoro pubblicate dalle aziende)
-- Le aziende pubblicano le posizioni tramite /admin.
-- company_id fa riferimento alla tabella aziende (deve esistere prima).
CREATE TABLE public.job_positions (
  id           text        PRIMARY KEY,
  company_id   text        REFERENCES public.aziende(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  sector       text,
  location     text,
  work_mode    text,        -- 'In Sede' | 'Remoto' | 'Ibrido'
  description  text,
  benefits     text[],
  requirements text,
  is_active    boolean     DEFAULT true,
  published_at timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job positions visibili a tutti gli autenticati"
  ON public.job_positions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admin può gestire job positions"
  ON public.job_positions FOR ALL
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- Tabella job_interests (interesse espresso dagli studenti su una posizione)
-- Un utente può esprimere interesse su una posizione una sola volta (UNIQUE).
CREATE TABLE public.job_interests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_position_id text        NOT NULL REFERENCES public.job_positions(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, job_position_id)
);

ALTER TABLE public.job_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente vede solo i propri interessi"
  ON public.job_interests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Utente può inserire il proprio interesse"
  ON public.job_interests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Utente può rimuovere il proprio interesse"
  ON public.job_interests FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin vede tutti gli interessi"
  ON public.job_interests FOR SELECT
  TO authenticated
  USING (auth_is_admin());

-- Tabella job_team_members (referenti aziendali per ogni posizione)
CREATE TABLE public.job_team_members (
  id              uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  job_position_id text  NOT NULL REFERENCES public.job_positions(id) ON DELETE CASCADE,
  name            text  NOT NULL,
  role            text,
  email           text,
  sort_order      int   DEFAULT 0
);

ALTER TABLE public.job_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members visibili a tutti gli autenticati"
  ON public.job_team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admin può gestire team members"
  ON public.job_team_members FOR ALL
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());
