-- ============================================================
-- Fase 2 / voci 5 e 6 — Date delle Iscrizioni (Q10, Q15)
-- ============================================================
-- Development E Production. Tutte le date in ORA ITALIANA.
--
-- Voce 5 — nuova Iscrizione (studente), policy iscrizioni_insert_own:
--   - con scadenza: possibile fino al giorno PRIMA di scadenza_candidature
--     (scadenza 30/11 → ultimo giorno utile 29/11);
--   - senza scadenza: fino al giorno prima dell'inizio dell'evento.
--   Restano: solo per sé e solo "in_attesa".
--
-- Voce 6 — annullamento (studente), policy iscrizioni_delete_own:
--   - solo Iscrizioni in attesa o accettate (come prima);
--   - solo prima dell'inizio dell'evento (fino al giorno prima di event_date).
--
-- L'admin (policy "Admin gestisce iscrizioni") non è toccato.
-- Le sottoquery su events rispettano le RLS dello studente.
--
-- Policy prima della modifica (uguali su Dev e Prod, 19/11/2026):
--   iscrizioni_insert_own  INSERT {authenticated}
--     WITH CHECK ((auth.uid() = user_id) AND (stato = 'in_attesa'))
--   iscrizioni_delete_own  DELETE {authenticated}
--     USING ((auth.uid() = user_id) AND (stato = ANY (ARRAY['in_attesa','accettata'])))
--
-- Ripristino: fase2_voce5_6_iscrizioni_date_ripristino.sql
-- ============================================================

BEGIN;

DROP POLICY "iscrizioni_insert_own" ON public.iscrizioni_eventi;

CREATE POLICY "iscrizioni_insert_own" ON public.iscrizioni_eventi
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND stato = 'in_attesa'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = iscrizioni_eventi.event_id
        AND (now() AT TIME ZONE 'Europe/Rome')::date
            < COALESCE(e.scadenza_candidature, e.event_date)
    )
  );

DROP POLICY "iscrizioni_delete_own" ON public.iscrizioni_eventi;

CREATE POLICY "iscrizioni_delete_own" ON public.iscrizioni_eventi
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND stato IN ('in_attesa', 'accettata')
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = iscrizioni_eventi.event_id
        AND (now() AT TIME ZONE 'Europe/Rome')::date < e.event_date
    )
  );

COMMIT;


-- ============================================================
-- Verifica (sola lettura): eseguire dopo il COMMIT
-- Atteso: 5 policy; insert_own e delete_own con "Europe/Rome"
-- ============================================================
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'iscrizioni_eventi'
-- ORDER BY policyname;
