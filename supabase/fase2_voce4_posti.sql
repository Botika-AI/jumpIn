-- ============================================================
-- Fase 2 / voce 4 — Posti mai superati (Q9, Q16)
-- ============================================================
-- Development E Production. Trigger su iscrizioni_eventi:
--   - nuova Iscrizione (qualsiasi stato): rifiutata se le Iscrizioni
--     accettate hanno già raggiunto max_partecipanti ("a posti esauriti
--     non ci si iscrive");
--   - Iscrizione che DIVENTA accettata (o cambia evento da accettata):
--     rifiutata se le altre accettate hanno già raggiunto i posti.
--   - max_partecipanti vuoto = nessun limite.
--   - Le modifiche che non aggiungono un'accettata (rifiutare, rimettere
--     in attesa, cancellare) passano sempre.
--
-- Due admin contemporanei: il trigger blocca la riga dell'evento
-- (FOR NO KEY UPDATE) prima di contare, quindi le accettazioni sullo
-- stesso evento avvengono una alla volta e il conteggio è sempre giusto.
-- Un'accettazione multipla (più righe in un solo comando) che supera i
-- posti viene rifiutata per intero.
--
-- SECURITY DEFINER: lo studente che si iscrive non vede le iscrizioni
-- degli altri (dopo la voce 10) e non può bloccare la riga dell'evento.
--
-- Errore restituito: SQLSTATE 23514, messaggio "Posti esauriti per questo evento".
--
-- Ripristino: fase2_voce4_posti_ripristino.sql
-- ============================================================

BEGIN;

CREATE FUNCTION public.iscrizioni_controlla_posti()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max       integer;
  v_accettate integer;
BEGIN
  -- Serve un controllo solo se la riga aggiunge un'iscrizione all'evento
  -- o una nuova accettata.
  IF TG_OP = 'UPDATE' AND NOT (
       NEW.stato = 'accettata'
       AND (OLD.stato IS DISTINCT FROM 'accettata' OR OLD.event_id IS DISTINCT FROM NEW.event_id)
     ) THEN
    RETURN NEW;
  END IF;

  SELECT e.max_partecipanti INTO v_max
  FROM public.events e
  WHERE e.id = NEW.event_id
  FOR NO KEY UPDATE;

  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_accettate
  FROM public.iscrizioni_eventi i
  WHERE i.event_id = NEW.event_id
    AND i.stato = 'accettata'
    AND i.id IS DISTINCT FROM NEW.id;

  IF v_accettate >= v_max THEN
    RAISE EXCEPTION 'Posti esauriti per questo evento' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.iscrizioni_controlla_posti() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER iscrizioni_controlla_posti
  BEFORE INSERT OR UPDATE OF stato, event_id ON public.iscrizioni_eventi
  FOR EACH ROW EXECUTE FUNCTION public.iscrizioni_controlla_posti();

COMMIT;


-- ============================================================
-- Verifica (sola lettura): eseguire dopo il COMMIT
-- Atteso: 1 riga, trigger BEFORE INSERT OR UPDATE OF stato, event_id
-- ============================================================
-- SELECT tgname, pg_get_triggerdef(oid)
-- FROM pg_trigger
-- WHERE tgrelid = 'public.iscrizioni_eventi'::regclass AND NOT tgisinternal;
