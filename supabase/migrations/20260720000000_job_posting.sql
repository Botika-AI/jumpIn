-- Tabella job_positions: offerte di lavoro create dall'admin
CREATE TABLE IF NOT EXISTS public.job_positions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo               text        NOT NULL,
  azienda_id           uuid        REFERENCES public.aziende(id) ON DELETE SET NULL,
  modalita             text,                              -- 'In sede' | 'Da remoto' | 'Ibrido'
  sede                 text,
  descrizione          text,
  responsabilita       text,
  requisiti            text,
  deadline_candidature date,
  max_candidature      int,
  form_esterno         text,
  target_studenti      text,
  visibilita           text        NOT NULL DEFAULT 'tutti_studenti',  -- 'tutti_studenti' | 'studenti_selezionati'
  in_homepage          boolean     NOT NULL DEFAULT false,
  stato                text        NOT NULL DEFAULT 'bozza',           -- 'attivo' | 'bozza' | 'chiuso'
  created_at           timestamptz DEFAULT now()
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

-- Tabella job_applications: candidature degli studenti a un job post
CREATE TABLE IF NOT EXISTS public.job_applications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_position_id uuid        NOT NULL REFERENCES public.job_positions(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stato           text        NOT NULL DEFAULT 'in_attesa',  -- 'in_attesa' | 'accettata' | 'rifiutata'
  created_at      timestamptz DEFAULT now(),
  UNIQUE (job_position_id, user_id)
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Studente vede le proprie candidature"
  ON public.job_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Studente può candidarsi"
  ON public.job_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Studente può ritirare la propria candidatura"
  ON public.job_applications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin vede tutte le candidature"
  ON public.job_applications FOR ALL
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());
