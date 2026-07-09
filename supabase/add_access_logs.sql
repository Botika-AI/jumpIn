-- Tabella access_logs: traccia ogni login alla piattaforma
CREATE TABLE IF NOT EXISTS public.access_logs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_type    text        NOT NULL DEFAULT 'studente', -- 'studente' | 'azienda'
  accessed_at  timestamptz NOT NULL DEFAULT now()
);

-- Indici per query veloci su dashboard
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at ON public.access_logs (accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id     ON public.access_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_type   ON public.access_logs (user_type);

-- RLS
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Gli utenti possono inserire solo il proprio log
CREATE POLICY "Utenti inseriscono proprio log"
  ON public.access_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solo admin può leggere tutto
CREATE POLICY "Admin legge access_logs"
  ON public.access_logs FOR SELECT
  USING (auth_is_admin());
