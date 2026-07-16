-- ============================================================
-- Estende la tabella events esistente (già usata per QR check-in)
-- con colonne per la gestione eventi admin (iscrizioni, visibilità, ecc.)
-- e crea iscrizioni_eventi separata da attendances.
--
-- DISTINZIONE:
--   attendances     → scansioni QR (ingresso/uscita), multiple per utente
--   iscrizioni_eventi → registrazione a evento, una per utente, con approvazione
-- ============================================================

-- ── 1. Nuove colonne su events ────────────────────────────────────────────────

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tipo                 text,
  ADD COLUMN IF NOT EXISTS azienda_id           uuid REFERENCES public.aziende(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS descrizione          text,
  ADD COLUMN IF NOT EXISTS logo_url             text,   -- immagine quadrata per card/lista
  ADD COLUMN IF NOT EXISTS cover_url            text,   -- immagine rettangolare per vista dettaglio
  ADD COLUMN IF NOT EXISTS modalita             text,
  ADD COLUMN IF NOT EXISTS scadenza_candidature date,
  ADD COLUMN IF NOT EXISTS max_partecipanti     int,
  ADD COLUMN IF NOT EXISTS tags                 text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visibilita           text   DEFAULT 'solo_studenti',
  ADD COLUMN IF NOT EXISTS form_esterno         text,
  ADD COLUMN IF NOT EXISTS stato                text   DEFAULT 'pubblicato';

-- Allinea gli eventi già esistenti (creati prima di questa migrazione) a 'pubblicato'
UPDATE public.events SET stato = 'pubblicato' WHERE stato IS NULL;

-- ── 2. RLS su events: aggiorna SELECT per filtrare per stato ──────────────────

-- Rimuovi la vecchia policy di SELECT (se esiste con qualsiasi nome comune)
DROP POLICY IF EXISTS "events_select_authenticated"     ON public.events;
DROP POLICY IF EXISTS "Tutti gli autenticati leggono"   ON public.events;
DROP POLICY IF EXISTS "Allow select for authenticated"  ON public.events;

-- Studenti vedono solo eventi pubblicati; admin vede tutto
CREATE POLICY "events_select_authenticated" ON public.events
  FOR SELECT TO authenticated
  USING (auth_is_admin() OR stato = 'pubblicato' OR stato IS NULL);

-- ── 3. Tabella iscrizioni_eventi ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.iscrizioni_eventi (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   text        NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stato      text        NOT NULL DEFAULT 'in_attesa',   -- in_attesa | accettata | rifiutata
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.iscrizioni_eventi ENABLE ROW LEVEL SECURITY;

-- Admin: può leggere e modificare tutte le iscrizioni
CREATE POLICY "Admin gestisce iscrizioni" ON public.iscrizioni_eventi
  FOR ALL
  USING  (auth_is_admin())
  WITH CHECK (auth_is_admin());

-- Studente: può vedere e gestire solo le proprie iscrizioni
CREATE POLICY "Studenti gestiscono proprie iscrizioni" ON public.iscrizioni_eventi
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
