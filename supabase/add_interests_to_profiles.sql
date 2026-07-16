-- Migration: aggiungi colonne interests e goals alla tabella profiles
-- Applicare una volta sola via Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS goals     text[] DEFAULT '{}';
