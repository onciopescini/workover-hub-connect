-- ================================================================
-- DUAL-TRACK REVIEW SYSTEM MIGRATION
-- ================================================================
-- Obiettivo: Implementare sistema di recensioni separato per:
-- 1. COWORKER → SPAZIO (nuova tabella space_reviews)
-- 2. HOST → COWORKER (tabella esistente booking_reviews)
-- ================================================================
-- 
-- ISTRUZIONI PER L'ESECUZIONE:
-- 1. Apri Supabase SQL Editor: https://supabase.com/dashboard/project/khtqwzvrxzsgfhsslwyz/sql/new
-- 2. Copia e incolla questo intero file
-- 3. Esegui il migration
-- 4. Verifica che non ci siano errori
-- ================================================================

BEGIN;

-- ================================================================
-- FASE 1: CREAZIONE TABELLA space_reviews
-- ================================================================

CREATE TABLE IF NOT EXISTS public.space_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT CHECK (char_length(content) <= 500),
  is_visible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_space_review_per_booking UNIQUE(booking_id, author_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_space_reviews_space ON public.space_reviews(space_id);
CREATE INDEX IF NOT EXISTS idx_space_reviews_visible ON public.space_reviews(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_space_reviews_booking ON public.space_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_space_reviews_author ON public.space_reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_space_reviews_created ON public.space_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE public.space_reviews ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- FASE 2: RLS POLICIES per space_reviews
-- ================================================================

-- SELECT: Tutti vedono recensioni visibili, autore e host vedono le proprie
CREATE POLICY "space_reviews_select"
ON public.space_reviews FOR SELECT
USING (
  is_visible = true 
  OR author_id = (SELECT auth.uid())
  OR (SELECT auth.uid()) IN (
    SELECT host_id FROM public.spaces WHERE id = space_reviews.space_id
  )
  OR is_admin((SELECT auth.uid()))
);

-- INSERT: Solo coworker dopo prenotazione completata
CREATE POLICY "space_reviews_insert"
ON public.space_reviews FOR INSERT
WITH CHECK (
  author_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_id
    AND b.user_id = (SELECT auth.uid())
    AND b.status = 'served'::booking_status
    AND b.service_completed_at IS NOT NULL
    AND b.service_completed_at < now() - INTERVAL '24 hours'
    AND b.service_completed_at > now() - INTERVAL '14 days'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.space_reviews sr
    WHERE sr.booking_id = space_reviews.booking_id
    AND sr.author_id = (SELECT auth.uid())
  )
);

-- UPDATE: Solo autore entro 48h dalla creazione
CREATE POLICY "space_reviews_update"
ON public.space_reviews FOR UPDATE
USING (
  author_id = (SELECT auth.uid())
  AND created_at > now() - INTERVAL '48 hours'
)
WITH CHECK (author_id = (SELECT auth.uid()));

-- DELETE: Solo admin
CREATE POLICY "space_reviews_delete"
ON public.space_reviews FOR DELETE
USING (is_admin((SELECT auth.uid())));

-- ================================================================
-- FASE 3: TRIGGERS per space_reviews
-- ================================================================

-- Trigger per visibilità automatica dopo 14 giorni
CREATE OR REPLACE FUNCTION public.check_space_review_visibility()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Se la recensione ha più di 14 giorni, rendila visibile
  IF NEW.created_at < now() - INTERVAL '14 days' THEN
    NEW.is_visible := true;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER space_review_auto_visibility
BEFORE INSERT OR UPDATE ON public.space_reviews
FOR EACH ROW
EXECUTE FUNCTION public.check_space_review_visibility();

-- Trigger per updated_at
CREATE TRIGGER space_reviews_updated_at
BEFORE UPDATE ON public.space_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- FASE 4: FUNZIONI RPC per space_reviews
-- ================================================================

-- Get Space Reviews
CREATE OR REPLACE FUNCTION public.get_space_reviews(space_id_param UUID)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  content TEXT,
  created_at TIMESTAMPTZ,
  author_first_name TEXT,
  author_last_name TEXT,
  author_profile_photo_url TEXT,
  booking_date DATE,
  is_visible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.rating,
    sr.content,
    sr.created_at,
    p.first_name,
    p.last_name,
    p.profile_photo_url,
    b.booking_date,
    sr.is_visible
  FROM space_reviews sr
  JOIN bookings b ON sr.booking_id = b.id
  JOIN profiles p ON sr.author_id = p.id
  WHERE sr.space_id = space_id_param
    AND sr.is_visible = true
  ORDER BY sr.created_at DESC;
END;
$$;

-- Calculate Space Weighted Rating
CREATE OR REPLACE FUNCTION public.calculate_space_weighted_rating(space_id_param UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  weighted_sum NUMERIC := 0;
  total_weight NUMERIC := 0;
  review_record RECORD;
  recency_weight NUMERIC;
BEGIN
  FOR review_record IN 
    SELECT rating, created_at 
    FROM space_reviews
    WHERE space_id = space_id_param
      AND is_visible = true
  LOOP
    -- Peso basato sulla recency (decresce linearmente fino a 0.1 dopo 1 anno)
    recency_weight := GREATEST(
      1.0 - (EXTRACT(EPOCH FROM (now() - review_record.created_at)) / (365.25 * 24 * 3600)),
      0.1
    );
    weighted_sum := weighted_sum + (review_record.rating * recency_weight);
    total_weight := total_weight + recency_weight;
  END LOOP;

  IF total_weight > 0 THEN
    RETURN ROUND(weighted_sum / total_weight, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- Get Space Review Status for a booking
CREATE OR REPLACE FUNCTION public.get_space_review_status(
  booking_id_param UUID,
  user_id_param UUID
)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record RECORD;
  review_exists BOOLEAN;
  can_review BOOLEAN := false;
  days_until_visible INTEGER := 0;
  review_is_visible BOOLEAN := false;
BEGIN
  -- Get booking details
  SELECT 
    b.status,
    b.service_completed_at,
    b.space_id,
    b.user_id
  INTO booking_record
  FROM bookings b
  WHERE b.id = booking_id_param;

  -- Check if review exists
  SELECT EXISTS(
    SELECT 1 FROM space_reviews
    WHERE booking_id = booking_id_param
      AND author_id = user_id_param
  ) INTO review_exists;

  -- Get review visibility if exists
  IF review_exists THEN
    SELECT is_visible INTO review_is_visible
    FROM space_reviews
    WHERE booking_id = booking_id_param
      AND author_id = user_id_param;
      
    -- Calculate days until visible
    SELECT GREATEST(0, 14 - EXTRACT(day FROM now() - created_at)::INTEGER)
    INTO days_until_visible
    FROM space_reviews
    WHERE booking_id = booking_id_param
      AND author_id = user_id_param;
  END IF;

  -- Check if user can write review
  IF booking_record.status = 'served'::booking_status
     AND booking_record.service_completed_at IS NOT NULL
     AND booking_record.service_completed_at < now() - INTERVAL '24 hours'
     AND booking_record.service_completed_at > now() - INTERVAL '14 days'
     AND booking_record.user_id = user_id_param
     AND NOT review_exists
  THEN
    can_review := true;
  END IF;

  RETURN jsonb_build_object(
    'canWriteReview', can_review,
    'hasWrittenReview', review_exists,
    'isVisible', review_is_visible,
    'daysUntilVisible', days_until_visible
  );
END;
$$;

-- ================================================================
-- FASE 5: FIX booking_reviews (HOST → COWORKER)
-- ================================================================

-- Fix trigger per visibilità mutuale
DROP TRIGGER IF EXISTS check_mutual_review_visibility ON public.booking_reviews;
DROP FUNCTION IF EXISTS public.check_mutual_review_visibility();

CREATE OR REPLACE FUNCTION public.check_mutual_review_visibility()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  other_review_exists BOOLEAN;
BEGIN
  -- Controlla se esiste l'altra recensione (senza controllare is_visible)
  SELECT EXISTS(
    SELECT 1 FROM booking_reviews
    WHERE booking_id = NEW.booking_id
      AND author_id = NEW.target_id
      AND target_id = NEW.author_id
  ) INTO other_review_exists;

  -- Se entrambe le recensioni esistono, rendile visibili
  IF other_review_exists THEN
    NEW.is_visible := true;
    
    -- Rendi visibile anche l'altra recensione
    UPDATE booking_reviews
    SET is_visible = true
    WHERE booking_id = NEW.booking_id
      AND author_id = NEW.target_id
      AND target_id = NEW.author_id
      AND is_visible = false;
  END IF;

  -- Se la recensione ha più di 14 giorni, rendila visibile comunque
  IF NEW.created_at < now() - INTERVAL '14 days' THEN
    NEW.is_visible := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_mutual_review_visibility
BEFORE INSERT OR UPDATE ON public.booking_reviews
FOR EACH ROW
EXECUTE FUNCTION public.check_mutual_review_visibility();

-- Rinomina funzione esistente per chiarezza
DROP FUNCTION IF EXISTS public.get_space_reviews_with_details(UUID);

CREATE OR REPLACE FUNCTION public.get_coworker_reviews_for_host(host_id_param UUID)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  content TEXT,
  created_at TIMESTAMPTZ,
  coworker_first_name TEXT,
  coworker_last_name TEXT,
  coworker_profile_photo_url TEXT,
  booking_date DATE,
  space_title TEXT,
  is_visible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    br.rating,
    br.content,
    br.created_at,
    p.first_name,
    p.last_name,
    p.profile_photo_url,
    b.booking_date,
    s.title,
    br.is_visible
  FROM booking_reviews br
  JOIN bookings b ON br.booking_id = b.id
  JOIN profiles p ON br.target_id = p.id
  JOIN spaces s ON b.space_id = s.id
  WHERE br.author_id = host_id_param
    AND br.is_visible = true
  ORDER BY br.created_at DESC;
END;
$$;

-- Crea anche funzione per ottenere reviews ricevute da un coworker
CREATE OR REPLACE FUNCTION public.get_coworker_received_reviews(coworker_id_param UUID)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  content TEXT,
  created_at TIMESTAMPTZ,
  host_first_name TEXT,
  host_last_name TEXT,
  host_profile_photo_url TEXT,
  booking_date DATE,
  space_title TEXT,
  is_visible BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    br.rating,
    br.content,
    br.created_at,
    p.first_name,
    p.last_name,
    p.profile_photo_url,
    b.booking_date,
    s.title,
    br.is_visible
  FROM booking_reviews br
  JOIN bookings b ON br.booking_id = b.id
  JOIN profiles p ON br.author_id = p.id
  JOIN spaces s ON b.space_id = s.id
  WHERE br.target_id = coworker_id_param
    AND br.is_visible = true
  ORDER BY br.created_at DESC;
END;
$$;

-- ================================================================
-- VERIFICA FINALE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Dual-track review system migration completed successfully';
  RAISE NOTICE 'Tables created: space_reviews';
  RAISE NOTICE 'Policies created: 4 for space_reviews';
  RAISE NOTICE 'Triggers created: 2 for space_reviews, 1 fixed for booking_reviews';
  RAISE NOTICE 'Functions created: 5 RPC functions';
END $$;

COMMIT;
