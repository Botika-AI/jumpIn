-- ============================================================
-- Prova: modifica profilo da admin + eliminazione account — SOLO Development
-- ============================================================
-- Da eseguire nel SQL Editor di Development DOPO
-- supabase/bug_profilo_admin_elimina_account.sql.
--
-- Simula le chiamate dal browser (ruolo "authenticated"/"anon" con l'utente
-- impostato nel token) e alla fine ANNULLA TUTTO con un errore voluto:
--   "ESITO: N/N prove superate. Tutto annullato."
-- Anche l'eliminazione dell'account di prova viene annullata.
-- ============================================================

DO $$
DECLARE
  stud  uuid;   -- studente di prova (.env.test.local)
  altro uuid;   -- un altro studente
  adm   uuid;
  n     int;
  ok    int := 0;
  tot   int := 0;
  msg   text := '';
BEGIN
  IF EXISTS (SELECT 1 FROM public.events WHERE id = 'start-up_weekend') THEN
    RAISE EXCEPTION 'STOP: questo è Production';
  END IF;
  SELECT id INTO stud  FROM public.profiles WHERE lower(email) = 'danielegazzositest@gmail.com' AND NOT is_admin;
  SELECT id INTO altro FROM public.profiles WHERE NOT is_admin AND id <> stud ORDER BY id LIMIT 1;
  SELECT id INTO adm   FROM public.profiles WHERE is_admin ORDER BY id LIMIT 1;
  IF stud IS NULL OR altro IS NULL OR adm IS NULL THEN
    RAISE EXCEPTION 'STOP: servono lo studente di prova, un altro studente e un admin';
  END IF;

  -- ── Come studente di prova ─────────────────────────────────
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', stud, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', stud::text, true);

  -- 1. Studente modifica il profilo di un altro → 0 righe
  UPDATE public.profiles SET bio = 'ATTACCO' WHERE id = altro;
  GET DIAGNOSTICS n = ROW_COUNT;
  tot := tot + 1;
  IF n = 0 THEN ok := ok + 1; ELSE msg := msg || ' | FALLITA 1: studente ha modificato un altro profilo'; END IF;

  -- 2. Studente modifica il proprio profilo → 1 riga (come prima)
  UPDATE public.profiles SET bio = 'PROVA' WHERE id = stud;
  GET DIAGNOSTICS n = ROW_COUNT;
  tot := tot + 1;
  IF n = 1 THEN ok := ok + 1; ELSE msg := msg || ' | FALLITA 2: studente non modifica il proprio profilo'; END IF;

  -- ── Come admin ─────────────────────────────────────────────
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', adm::text, true);

  -- 3. Admin modifica il profilo di uno studente (campi di StudenteModal) → 1 riga
  UPDATE public.profiles
     SET first_name = first_name, last_name = last_name, school = 'PROVA', dob = dob,
         bio = 'PROVA ADMIN', interests = interests
   WHERE id = altro;
  GET DIAGNOSTICS n = ROW_COUNT;
  tot := tot + 1;
  IF n = 1 THEN ok := ok + 1; ELSE msg := msg || format(' | FALLITA 3: admin ha modificato %s righe', n); END IF;

  -- 4. Admin prova a rendere admin uno studente → rifiutato
  tot := tot + 1;
  BEGIN
    UPDATE public.profiles SET is_admin = true WHERE id = altro;
    msg := msg || ' | FALLITA 4: is_admin modificabile';
  EXCEPTION WHEN insufficient_privilege THEN ok := ok + 1;
  END;

  -- 5. Admin non può usare delete_user
  tot := tot + 1;
  BEGIN
    PERFORM public.delete_user();
    msg := msg || ' | FALLITA 5: admin ha eliminato il proprio account';
  EXCEPTION WHEN insufficient_privilege THEN ok := ok + 1;
  END;

  -- ── Come anonimo ───────────────────────────────────────────
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);

  -- 6. Anonimo non può usare delete_user
  tot := tot + 1;
  BEGIN
    PERFORM public.delete_user();
    msg := msg || ' | FALLITA 6: anonimo ha usato delete_user';
  EXCEPTION WHEN insufficient_privilege THEN ok := ok + 1;
  END;

  -- ── Studente elimina il proprio account ────────────────────
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', stud, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', stud::text, true);

  tot := tot + 1;
  BEGIN
    PERFORM public.delete_user();
    ok := ok + 1;
  EXCEPTION WHEN OTHERS THEN msg := msg || ' | FALLITA 7: eliminazione rifiutata (' || SQLERRM || ')';
  END;

  -- Controlli fatti con i permessi pieni
  RESET ROLE;

  -- 8. Account e profilo dello studente di prova spariti, dati collegati spariti
  tot := tot + 1;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = stud)
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = stud)
     AND NOT EXISTS (SELECT 1 FROM public.iscrizioni_eventi WHERE user_id = stud)
     AND NOT EXISTS (SELECT 1 FROM public.attendances WHERE user_id = stud)
  THEN ok := ok + 1; ELSE msg := msg || ' | FALLITA 8: dati dello studente ancora presenti'; END IF;

  -- 9. L'altro studente e l'admin esistono ancora
  tot := tot + 1;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = altro) AND EXISTS (SELECT 1 FROM auth.users WHERE id = adm)
  THEN ok := ok + 1; ELSE msg := msg || ' | FALLITA 9: eliminato un account sbagliato'; END IF;

  RAISE EXCEPTION 'ESITO: %/% prove superate. Tutto annullato.%', ok, tot, msg;
END $$;
