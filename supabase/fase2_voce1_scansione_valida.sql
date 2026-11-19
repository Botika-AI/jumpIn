-- ============================================================
-- Fase 2 / voce 1 — Scansione valida (Q4, Q17)
-- ============================================================
-- Development E Production. Una Scansione è accettata solo se:
--   - è dello studente stesso (come prima);
--   - lo studente ha un'Iscrizione ACCETTATA a quell'evento;
--   - oggi, in ora italiana, è compreso tra event_date ed event_end
--     (se event_end è vuoto, solo il giorno di event_date);
--   - scanned_at è l'ora del database (now()): lo studente non può
--     inviare un'ora inventata. L'app non invia scanned_at, quindi
--     vale il valore predefinito.
-- Le scansioni ripetute restano permesse.
--
-- Le sottoquery rispettano le RLS dello studente: legge le proprie
-- iscrizioni e gli eventi visibili a lui.
--
-- Policy prima della modifica (uguale su Dev e Prod, 19/11/2026):
--   attendances_insert_own  INSERT  {authenticated}
--     WITH CHECK (auth.uid() = user_id)
--
-- Ripristino: fase2_voce1_scansione_valida_ripristino.sql
-- ============================================================

BEGIN;

DROP POLICY "attendances_insert_own" ON public.attendances;

CREATE POLICY "attendances_insert_own" ON public.attendances
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND scanned_at = now()
    AND EXISTS (
      SELECT 1 FROM public.iscrizioni_eventi i
      WHERE i.event_id = attendances.event_id
        AND i.user_id  = auth.uid()
        AND i.stato    = 'accettata'
    )
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = attendances.event_id
        AND (now() AT TIME ZONE 'Europe/Rome')::date
            BETWEEN e.event_date AND COALESCE(e.event_end, e.event_date)
    )
  );

COMMIT;


-- ============================================================
-- Verifica (sola lettura): eseguire dopo il COMMIT
-- Atteso: 2 policy; attendances_insert_own con il nuovo with_check
-- ============================================================
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'attendances'
-- ORDER BY policyname;
