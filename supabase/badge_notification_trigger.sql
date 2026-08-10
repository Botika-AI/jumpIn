-- 1. Aggiunge user_id nullable a notifiche
--    NULL = broadcast a tutti (comportamento esistente)
--    valorizzato = solo per quell'utente
ALTER TABLE public.notifiche
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Aggiorna la policy di lettura:
--    ogni utente vede le notifiche broadcast (user_id IS NULL)
--    + le proprie notifiche personali (user_id = auth.uid())
DROP POLICY IF EXISTS "Autenticati leggono notifiche" ON public.notifiche;
CREATE POLICY "Autenticati leggono notifiche" ON public.notifiche
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- 3. Trigger function: crea notifica personalizzata ad ogni assegnazione badge
CREATE OR REPLACE FUNCTION public.notify_badge_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nome text;
  v_descrizione text;
BEGIN
  SELECT nome, descrizione INTO v_nome, v_descrizione
  FROM public.badges
  WHERE id = NEW.badge_id;

  INSERT INTO public.notifiche (user_id, tipo, titolo, corpo, riferimento_id)
  VALUES (
    NEW.user_id,
    'badge',
    'Hai ottenuto il badge "' || v_nome || '"!',
    COALESCE(v_descrizione, 'Un nuovo badge è stato aggiunto al tuo profilo.'),
    NEW.badge_id::text
  );

  RETURN NEW;
END;
$$;

-- 4. Collega il trigger alla tabella badge_assegnazioni
--    AFTER INSERT = si attiva solo su nuove assegnazioni
--    ON CONFLICT DO NOTHING non scatena il trigger → nessun duplicato
DROP TRIGGER IF EXISTS on_badge_assegnato ON public.badge_assegnazioni;
CREATE TRIGGER on_badge_assegnato
  AFTER INSERT ON public.badge_assegnazioni
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_badge_assigned();
