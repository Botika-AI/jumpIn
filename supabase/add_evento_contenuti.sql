-- ============================================================
-- Aggiunge contenuti evento: takeaways, requisiti, materiali
-- ============================================================

-- 1. Nuove colonne su events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS cosa_impari text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requisiti   text;

-- 2. Tabella materiali_eventi (file o link per ogni evento)
CREATE TABLE IF NOT EXISTS public.materiali_eventi (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   text        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  titolo     text        NOT NULL,
  tipo       text        NOT NULL DEFAULT 'link',  -- 'link' | 'file'
  url        text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.materiali_eventi ENABLE ROW LEVEL SECURITY;

-- Admin: gestisce tutti i materiali
CREATE POLICY "Admin gestisce materiali" ON public.materiali_eventi
  FOR ALL USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Studenti: possono solo leggere
CREATE POLICY "Autenticati leggono materiali" ON public.materiali_eventi
  FOR SELECT TO authenticated USING (true);
