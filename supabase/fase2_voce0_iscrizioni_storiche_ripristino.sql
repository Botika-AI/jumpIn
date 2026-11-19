-- ============================================================
-- RIPRISTINO di fase2_voce0_iscrizioni_storiche.sql — SOLO PRODUCTION
-- ============================================================
-- Elimina le 12 iscrizioni storiche di start-up_weekend create dalla voce 0.
-- Tocca solo le righe con created_at = 2026-05-15 00:00 (ora italiana),
-- il segno lasciato dallo script: eventuali iscrizioni create in altro
-- modo restano dov'erano.
-- ============================================================

BEGIN;

DO $$
DECLARE
  n int;
BEGIN
  DELETE FROM public.iscrizioni_eventi
  WHERE event_id = 'start-up_weekend'
    AND created_at = timestamptz '2026-05-15 00:00:00 Europe/Rome'
    AND user_id IN (
      'b4e477e0-5b61-4403-83cf-7c5547f3d27f',
      'f745263c-55ed-4470-ad72-7a8581afbd00',
      '73926321-fc36-4599-afb5-19dac29c81e6',
      '3d362799-8174-45b1-b7e6-d5770b33a548',
      '7cfb59d3-2fe6-423e-b8a5-55984b5d346a',
      '83609b22-40be-4f2c-b09a-8c1224ebd8d1',
      '4ab8905c-90a3-4c07-a930-9960e811f863',
      '6067209a-6243-4ca7-808f-a77dd705a589',
      '64560abe-c96d-42e8-a118-b547a419e960',
      '0beb0afe-19a9-4171-9ec7-2c854c49df44',
      '510c64b9-fe0d-4e33-b37f-de4f639ceea5',
      'b89733f2-2c91-4bf5-9a50-ca2ffa62a2f2'
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 12 THEN
    RAISE EXCEPTION 'Eliminerebbe % righe (attese al massimo 12). Annullato.', n;
  END IF;
  RAISE NOTICE 'Eliminate % iscrizioni storiche', n;
END $$;

COMMIT;
