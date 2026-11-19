-- ============================================================
-- Prova della Fase 2 / voci 2 e 3 (badge automatico) — SOLO Development
-- ============================================================
-- Da eseguire nel SQL Editor di Development DOPO
-- supabase/fase2_voce2_badge_automatico.sql.
--
-- Crea dati di prova (8 eventi, iscrizioni, scansioni, un badge),
-- controlla le regole e alla fine ANNULLA TUTTO con un errore voluto:
--   "ESITO: N/N prove superate. Tutto annullato."
-- Il messaggio compare in rosso: è normale. Conta solo il numero.
--
-- Studente di prova: danielegazzositest@gmail.com (.env.test.local)
-- ============================================================

DO $$
DECLARE
  oggi  date := (now() AT TIME ZONE 'Europe/Rome')::date;
  stud  uuid;
  adm   uuid;
  bdg   uuid;
  k0    int := 0;
  k1    int := 0;
  n     int;
  r     int;
  ok    int := 0;
  tot   int := 0;
  msg   text := '';
BEGIN
  IF EXISTS (SELECT 1 FROM public.events WHERE id = 'start-up_weekend') THEN
    RAISE EXCEPTION 'STOP: questo è Production';
  END IF;
  SELECT id INTO stud FROM public.profiles
   WHERE lower(email) = 'danielegazzositest@gmail.com' AND is_admin = false;
  SELECT id INTO adm FROM public.profiles WHERE is_admin LIMIT 1;
  IF stud IS NULL OR adm IS NULL THEN
    RAISE EXCEPTION 'STOP: studente di prova o admin non trovato';
  END IF;

  -- Partecipazioni completate dello studente PRIMA dei dati di prova
  FOR n IN 1..200 LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.badge_studenti_idonei(n) s WHERE s.user_id = stud);
    k0 := n;
  END LOOP;

  -- Eventi di prova
  INSERT INTO public.events (id, name, event_date, event_end, stato) VALUES
    ('prova-voce2-e1', 'PROVA v2 E1 concluso, accettato, in+out',     oggi - 10, oggi - 9, 'pubblicato'),
    ('prova-voce2-e2', 'PROVA v2 E2 concluso, accettato, solo in',    oggi - 10, oggi - 9, 'pubblicato'),
    ('prova-voce2-e3', 'PROVA v2 E3 concluso, senza iscrizione',      oggi - 10, oggi - 9, 'pubblicato'),
    ('prova-voce2-e4', 'PROVA v2 E4 concluso, iscrizione in attesa',  oggi - 10, oggi - 9, 'pubblicato'),
    ('prova-voce2-e5', 'PROVA v2 E5 in corso, accettato, in+out',     oggi,      oggi + 1, 'pubblicato'),
    ('prova-voce2-e6', 'PROVA v2 E6 bozza, accettato, in+out',        oggi - 10, oggi - 9, 'bozza'),
    ('prova-voce2-e7', 'PROVA v2 E7 concluso, accettato, out poi in', oggi - 10, oggi - 9, 'pubblicato'),
    ('prova-voce2-e8', 'PROVA v2 E8 ieri senza event_end, in+out',    oggi - 1,  NULL,     'pubblicato');

  INSERT INTO public.iscrizioni_eventi (event_id, user_id, stato) VALUES
    ('prova-voce2-e1', stud, 'accettata'),
    ('prova-voce2-e2', stud, 'accettata'),
    ('prova-voce2-e4', stud, 'in_attesa'),
    ('prova-voce2-e5', stud, 'accettata'),
    ('prova-voce2-e6', stud, 'accettata'),
    ('prova-voce2-e7', stud, 'accettata'),
    ('prova-voce2-e8', stud, 'accettata'),
    ('prova-voce2-e1', adm,  'accettata');

  INSERT INTO public.attendances (user_id, event_id, type) VALUES
    (stud, 'prova-voce2-e1', 'ingresso'), (stud, 'prova-voce2-e1', 'uscita'),
    (stud, 'prova-voce2-e2', 'ingresso'), (stud, 'prova-voce2-e2', 'ingresso'),
    (stud, 'prova-voce2-e3', 'ingresso'), (stud, 'prova-voce2-e3', 'uscita'),
    (stud, 'prova-voce2-e4', 'ingresso'), (stud, 'prova-voce2-e4', 'uscita'),
    (stud, 'prova-voce2-e5', 'ingresso'), (stud, 'prova-voce2-e5', 'uscita'),
    (stud, 'prova-voce2-e6', 'ingresso'), (stud, 'prova-voce2-e6', 'uscita'),
    (stud, 'prova-voce2-e7', 'uscita'),   (stud, 'prova-voce2-e7', 'uscita'), (stud, 'prova-voce2-e7', 'ingresso'),
    (stud, 'prova-voce2-e8', 'ingresso'), (stud, 'prova-voce2-e8', 'uscita'),
    (adm,  'prova-voce2-e1', 'ingresso'), (adm,  'prova-voce2-e1', 'uscita');

  -- 1. Contano solo E1, E7, E8
  FOR n IN 1..200 LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.badge_studenti_idonei(n) s WHERE s.user_id = stud);
    k1 := n;
  END LOOP;
  tot := tot + 1;
  IF k1 = k0 + 3 THEN ok := ok + 1;
  ELSE msg := msg || format(' | FALLITA 1: attese %s partecipazioni in più, trovate %s', 3, k1 - k0); END IF;

  -- 2. Nessun admin tra gli idonei
  tot := tot + 1;
  IF NOT EXISTS (SELECT 1 FROM public.badge_studenti_idonei(1) s
                 JOIN public.profiles p ON p.id = s.user_id WHERE p.is_admin) THEN ok := ok + 1;
  ELSE msg := msg || ' | FALLITA 2: un admin risulta idoneo'; END IF;

  -- Da qui le funzioni vengono chiamate "come" uno studente e poi "come" un admin
  PERFORM set_config('request.jwt.claims', json_build_object('sub', stud, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', stud::text, true);

  -- 3. Studente: conteggio rifiutato
  tot := tot + 1;
  BEGIN
    PERFORM public.count_badge_eligible_students(1);
    msg := msg || ' | FALLITA 3: lo studente ha ottenuto il conteggio';
  EXCEPTION WHEN insufficient_privilege THEN ok := ok + 1;
  END;

  -- 4. Studente: assegnazione rifiutata
  INSERT INTO public.badges (nome, visibilita) VALUES ('PROVA voce2', 'bozza') RETURNING id INTO bdg;
  tot := tot + 1;
  BEGIN
    PERFORM public.assign_badge_by_event_threshold(bdg, 1);
    msg := msg || ' | FALLITA 4: lo studente ha assegnato un badge';
  EXCEPTION WHEN insufficient_privilege THEN ok := ok + 1;
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', adm::text, true);

  -- 5. Admin: il conteggio coincide con la regola
  tot := tot + 1;
  IF public.count_badge_eligible_students(k1) = (SELECT count(*) FROM public.badge_studenti_idonei(k1))
     AND public.count_badge_eligible_students(k1) >= 1 THEN ok := ok + 1;
  ELSE msg := msg || ' | FALLITA 5: conteggio admin diverso dalla regola'; END IF;

  -- 6. Admin: soglia non valida rifiutata
  tot := tot + 1;
  BEGIN
    PERFORM public.count_badge_eligible_students(0);
    msg := msg || ' | FALLITA 6: soglia 0 accettata';
  EXCEPTION WHEN invalid_parameter_value THEN ok := ok + 1;
  END;

  -- 7. Admin: assegnazione a chi ha almeno k1 partecipazioni (lo studente di prova incluso)
  r := public.assign_badge_by_event_threshold(bdg, k1);
  tot := tot + 1;
  IF r = (SELECT count(*) FROM public.badge_studenti_idonei(k1))
     AND EXISTS (SELECT 1 FROM public.badge_assegnazioni WHERE badge_id = bdg AND user_id = stud AND assegnato_da = adm)
  THEN ok := ok + 1;
  ELSE msg := msg || format(' | FALLITA 7: assegnati %s', r); END IF;

  -- 8. Admin: seconda assegnazione non crea doppioni
  tot := tot + 1;
  IF public.assign_badge_by_event_threshold(bdg, k1) = 0 THEN ok := ok + 1;
  ELSE msg := msg || ' | FALLITA 8: doppioni'; END IF;

  -- 9. Notifica creata per lo studente
  tot := tot + 1;
  IF EXISTS (SELECT 1 FROM public.notifiche WHERE user_id = stud AND riferimento_id = bdg::text) THEN ok := ok + 1;
  ELSE msg := msg || ' | FALLITA 9: nessuna notifica'; END IF;

  RAISE EXCEPTION 'ESITO: %/% prove superate. Tutto annullato.%', ok, tot, msg;
END $$;
