-- ============================================================
-- Prova della Fase 2 / voce 4 (posti) — SOLO Development
-- ============================================================
-- Da eseguire nel SQL Editor di Development DOPO supabase/fase2_voce4_posti.sql.
-- Crea eventi e iscrizioni di prova con 4 studenti qualsiasi, controlla
-- le regole e alla fine ANNULLA TUTTO con un errore voluto:
--   "ESITO: N/N prove superate. Tutto annullato."
-- Il messaggio compare in rosso: è normale. Conta solo il numero.
-- La prova "due admin contemporanei" non si può fare da qui: la garantisce
-- il blocco della riga dell'evento (vedi lo script).
-- ============================================================

DO $$
DECLARE
  s     uuid[];
  oggi  date := (now() AT TIME ZONE 'Europe/Rome')::date;
  n     int;
  ok    int := 0;
  tot   int := 0;
  msg   text := '';
BEGIN
  IF EXISTS (SELECT 1 FROM public.events WHERE id = 'start-up_weekend') THEN
    RAISE EXCEPTION 'STOP: questo è Production';
  END IF;
  SELECT array_agg(id) INTO s
  FROM (SELECT id FROM public.profiles WHERE is_admin = false ORDER BY id LIMIT 4) x;
  IF coalesce(array_length(s, 1), 0) < 4 THEN
    RAISE EXCEPTION 'STOP: servono almeno 4 studenti in Development';
  END IF;

  INSERT INTO public.events (id, name, event_date, event_end, stato, max_partecipanti) VALUES
    ('prova-voce4-p', 'PROVA v4 P (2 posti)',         oggi + 10, oggi + 10, 'pubblicato', 2),
    ('prova-voce4-b', 'PROVA v4 B (2 posti, multipla)', oggi + 10, oggi + 10, 'pubblicato', 2),
    ('prova-voce4-u', 'PROVA v4 U (senza limite)',    oggi + 10, oggi + 10, 'pubblicato', NULL);

  -- 1. Iscrizioni entro i posti
  tot := tot + 1;
  BEGIN
    INSERT INTO public.iscrizioni_eventi (event_id, user_id, stato) VALUES
      ('prova-voce4-p', s[1], 'accettata'),
      ('prova-voce4-p', s[2], 'in_attesa'),
      ('prova-voce4-p', s[3], 'in_attesa');
    ok := ok + 1;
  EXCEPTION WHEN check_violation THEN msg := msg || ' | FALLITA 1: iscrizioni entro i posti rifiutate';
  END;

  -- 2. Accettare il secondo (posti 2/2) → ok
  tot := tot + 1;
  BEGIN
    UPDATE public.iscrizioni_eventi SET stato = 'accettata' WHERE event_id = 'prova-voce4-p' AND user_id = s[2];
    ok := ok + 1;
  EXCEPTION WHEN check_violation THEN msg := msg || ' | FALLITA 2: secondo accettato rifiutato';
  END;

  -- 3. Accettare il terzo con posti esauriti → rifiutato
  tot := tot + 1;
  BEGIN
    UPDATE public.iscrizioni_eventi SET stato = 'accettata' WHERE event_id = 'prova-voce4-p' AND user_id = s[3];
    msg := msg || ' | FALLITA 3: accettato oltre i posti';
  EXCEPTION WHEN check_violation THEN ok := ok + 1;
  END;

  -- 4. Nuova iscrizione (in attesa) a posti esauriti → rifiutata
  tot := tot + 1;
  BEGIN
    INSERT INTO public.iscrizioni_eventi (event_id, user_id, stato) VALUES ('prova-voce4-p', s[4], 'in_attesa');
    msg := msg || ' | FALLITA 4: iscrizione creata a posti esauriti';
  EXCEPTION WHEN check_violation THEN ok := ok + 1;
  END;

  -- 5. Riscrivere "accettata" su chi è già accettato, a posti esauriti → ok
  tot := tot + 1;
  BEGIN
    UPDATE public.iscrizioni_eventi SET stato = 'accettata' WHERE event_id = 'prova-voce4-p' AND user_id = s[1];
    ok := ok + 1;
  EXCEPTION WHEN check_violation THEN msg := msg || ' | FALLITA 5: già accettato bloccato';
  END;

  -- 6. Rimuovere uno (rifiutata) e accettare il terzo → ok
  tot := tot + 1;
  BEGIN
    UPDATE public.iscrizioni_eventi SET stato = 'rifiutata' WHERE event_id = 'prova-voce4-p' AND user_id = s[1];
    UPDATE public.iscrizioni_eventi SET stato = 'accettata' WHERE event_id = 'prova-voce4-p' AND user_id = s[3];
    ok := ok + 1;
  EXCEPTION WHEN check_violation THEN msg := msg || ' | FALLITA 6: posto liberato non riutilizzabile';
  END;

  -- 7. Accettazione multipla oltre i posti → rifiutata per intero
  INSERT INTO public.iscrizioni_eventi (event_id, user_id, stato) VALUES
    ('prova-voce4-b', s[1], 'in_attesa'), ('prova-voce4-b', s[2], 'in_attesa'), ('prova-voce4-b', s[3], 'in_attesa');
  tot := tot + 1;
  BEGIN
    UPDATE public.iscrizioni_eventi SET stato = 'accettata' WHERE event_id = 'prova-voce4-b';
    msg := msg || ' | FALLITA 7: multipla oltre i posti accettata';
  EXCEPTION WHEN check_violation THEN ok := ok + 1;
  END;
  tot := tot + 1;
  SELECT count(*) INTO n FROM public.iscrizioni_eventi WHERE event_id = 'prova-voce4-b' AND stato = 'accettata';
  IF n = 0 THEN ok := ok + 1; ELSE msg := msg || format(' | FALLITA 8: dopo la multipla rifiutata %s accettate', n); END IF;

  -- 9. Multipla entro i posti → ok
  tot := tot + 1;
  BEGIN
    UPDATE public.iscrizioni_eventi SET stato = 'accettata' WHERE event_id = 'prova-voce4-b' AND user_id IN (s[1], s[2]);
    ok := ok + 1;
  EXCEPTION WHEN check_violation THEN msg := msg || ' | FALLITA 9: multipla entro i posti rifiutata';
  END;

  -- 10. Evento senza limite → 4 accettate ok
  tot := tot + 1;
  BEGIN
    INSERT INTO public.iscrizioni_eventi (event_id, user_id, stato)
    SELECT 'prova-voce4-u', x, 'accettata' FROM unnest(s) x;
    ok := ok + 1;
  EXCEPTION WHEN check_violation THEN msg := msg || ' | FALLITA 10: evento senza limite bloccato';
  END;

  -- 11. Cancellare un'iscrizione a posti esauriti → ok
  tot := tot + 1;
  BEGIN
    DELETE FROM public.iscrizioni_eventi WHERE event_id = 'prova-voce4-p' AND user_id = s[2];
    ok := ok + 1;
  EXCEPTION WHEN OTHERS THEN msg := msg || ' | FALLITA 11: cancellazione bloccata';
  END;

  RAISE EXCEPTION 'ESITO: %/% prove superate. Tutto annullato.%', ok, tot, msg;
END $$;
