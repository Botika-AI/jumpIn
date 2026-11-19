-- ============================================================
-- Fase 2 / voce 0 — Iscrizioni storiche di "Start-up Weekend" (Q24)
-- ============================================================
-- SOLO PRODUCTION. Le scansioni del 15–17/05/2026 sono state fatte
-- quando le iscrizioni non esistevano ancora. Con la regola 1 (scansione
-- valida solo con Iscrizione accettata) queste partecipazioni non
-- conterebbero più: qui si crea l'Iscrizione accettata mancante.
--
-- Decisioni (19/11/2026):
--   - "Jumper next level" era una prova con account interni: escluso.
--   - Esclusi yuri.mondaini@fattorcomune.com (personale) e
--     gazzosidaniele@gmail.com (account di prova).
--   - Inclusi i 12 studenti che hanno scansionato, anche chi ha solo
--     uscite: l'iscrizione dice che era ammesso, la Partecipazione
--     completata dipende sempre dalle scansioni.
--
-- Sicurezza dello script:
--   - Tutto o niente (BEGIN/COMMIT).
--   - Si ferma se l'evento non esiste, se un id non corrisponde
--     all'email attesa o se esiste già un'iscrizione per questi studenti.
--     Eseguito su Development si ferma da solo (gli studenti non ci sono).
--   - Nessun trigger su iscrizioni_eventi: non parte nessuna notifica.
--
-- Ripristino: fase2_voce0_iscrizioni_storiche_ripristino.sql
-- ============================================================

BEGIN;

CREATE TEMP TABLE voce0_studenti (user_id uuid PRIMARY KEY, email text NOT NULL) ON COMMIT DROP;

INSERT INTO voce0_studenti (user_id, email) VALUES
  ('b4e477e0-5b61-4403-83cf-7c5547f3d27f', 'ionututa545@gmail.com'),
  ('f745263c-55ed-4470-ad72-7a8581afbd00', 'simogessa7@gmail.com'),
  ('73926321-fc36-4599-afb5-19dac29c81e6', 'ionela.eremetchi08@gmail.com'),
  ('3d362799-8174-45b1-b7e6-d5770b33a548', 'vittoria.cartelli@gmail.com'),
  ('7cfb59d3-2fe6-423e-b8a5-55984b5d346a', 'halilizaim@gmail.com'),
  ('83609b22-40be-4f2c-b09a-8c1224ebd8d1', 'fabbrim656@gmail.com'),
  ('4ab8905c-90a3-4c07-a930-9960e811f863', 'caterinapartisani@gmail.com'),
  ('6067209a-6243-4ca7-808f-a77dd705a589', 'angeliniviola07@gmail.com'),
  ('64560abe-c96d-42e8-a118-b547a419e960', 'nikolasraimondi@icloud.com'),
  ('0beb0afe-19a9-4171-9ec7-2c854c49df44', 'andreabruschi2008@gmail.com'),
  ('510c64b9-fe0d-4e33-b37f-de4f639ceea5', 'lucaranucin@gmail.com'),
  ('b89733f2-2c91-4bf5-9a50-ca2ffa62a2f2', 'fraveneruz@gmail.com');

DO $$
DECLARE
  n_profili     int;
  n_scansioni   int;
  n_esistenti   int;
  n_inserite    int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = 'start-up_weekend') THEN
    RAISE EXCEPTION 'Evento start-up_weekend non trovato: progetto sbagliato?';
  END IF;

  SELECT count(*) INTO n_profili
  FROM voce0_studenti s JOIN public.profiles p ON p.id = s.user_id AND p.email = s.email;
  IF n_profili <> 12 THEN
    RAISE EXCEPTION 'Profili trovati con id ed email attesi: % su 12. Fermato.', n_profili;
  END IF;

  SELECT count(DISTINCT a.user_id) INTO n_scansioni
  FROM public.attendances a JOIN voce0_studenti s ON s.user_id = a.user_id
  WHERE a.event_id = 'start-up_weekend';
  IF n_scansioni <> 12 THEN
    RAISE EXCEPTION 'Studenti con scansioni su start-up_weekend: % su 12. Fermato.', n_scansioni;
  END IF;

  SELECT count(*) INTO n_esistenti
  FROM public.iscrizioni_eventi i JOIN voce0_studenti s ON s.user_id = i.user_id
  WHERE i.event_id = 'start-up_weekend';
  IF n_esistenti <> 0 THEN
    RAISE EXCEPTION 'Esistono già % iscrizioni per questi studenti. Fermato.', n_esistenti;
  END IF;

  INSERT INTO public.iscrizioni_eventi (event_id, user_id, stato, created_at)
  SELECT 'start-up_weekend', s.user_id, 'accettata', timestamptz '2026-05-15 00:00:00 Europe/Rome'
  FROM voce0_studenti s;

  GET DIAGNOSTICS n_inserite = ROW_COUNT;
  IF n_inserite <> 12 THEN
    RAISE EXCEPTION 'Inserite % iscrizioni invece di 12. Annullato.', n_inserite;
  END IF;

  RAISE NOTICE 'OK: 12 iscrizioni accettate create per start-up_weekend';
END $$;

COMMIT;


-- ============================================================
-- Verifica (sola lettura): eseguire dopo il COMMIT
-- Atteso: 12 righe, tutte "accettata", created_at 2026-05-14 22:00:00+00
-- ============================================================
-- SELECT p.email, i.stato, i.created_at
-- FROM public.iscrizioni_eventi i
-- JOIN public.profiles p ON p.id = i.user_id
-- WHERE i.event_id = 'start-up_weekend'
-- ORDER BY p.email;
