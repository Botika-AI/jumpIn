-- ============================================================
-- Tabella notifiche in-app (campanella studenti)
-- Ogni riga = una notifica inviata dall'admin a tutti gli studenti
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifiche (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo           text        NOT NULL DEFAULT 'evento',   -- 'evento' | 'sistema'
  titolo         text        NOT NULL,
  corpo          text,
  riferimento_id text,       -- event_id collegato (nullable)
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifiche ENABLE ROW LEVEL SECURITY;

-- Admin: può creare, modificare, eliminare notifiche
CREATE POLICY "Admin gestisce notifiche" ON public.notifiche
  FOR ALL
  USING  (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- Studenti: possono solo leggere
CREATE POLICY "Autenticati leggono notifiche" ON public.notifiche
  FOR SELECT TO authenticated
  USING (true);
