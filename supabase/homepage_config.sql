-- ============================================================
-- Gestione Homepage (admin):
-- 1) ordine delle 3 sezioni della home studente (drag & drop admin)
-- 2) eventi "in evidenza" scelti manualmente dall'admin, con ordine
-- Eseguire in Supabase SQL Editor
-- ============================================================

-- 1. Ordine sezioni homepage
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id          text        PRIMARY KEY,   -- 'esperienze_evidenza' | 'da_non_perdere' | 'progressi'
  label       text        NOT NULL,
  ordine      int         NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.homepage_sections (id, label, ordine) VALUES
  ('esperienze_evidenza', 'Esperienze in evidenza', 1),
  ('da_non_perdere',      'Da non perdere',         2),
  ('progressi',           'I tuoi progressi',       3)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_sections_select_all"  ON public.homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_admin_write" ON public.homepage_sections;

CREATE POLICY "homepage_sections_select_all" ON public.homepage_sections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "homepage_sections_admin_write" ON public.homepage_sections
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- 2. Eventi in evidenza in homepage (scelti a mano dall'admin)
CREATE TABLE IF NOT EXISTS public.homepage_evidenza (
  event_id    text        PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  ordine      int         NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_evidenza ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_evidenza_select_all"  ON public.homepage_evidenza;
DROP POLICY IF EXISTS "homepage_evidenza_admin_write" ON public.homepage_evidenza;

CREATE POLICY "homepage_evidenza_select_all" ON public.homepage_evidenza
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "homepage_evidenza_admin_write" ON public.homepage_evidenza
  FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());
