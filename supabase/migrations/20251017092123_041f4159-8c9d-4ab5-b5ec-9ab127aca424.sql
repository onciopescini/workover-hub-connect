-- FASE 1.3 & 3.1 & 3.2: 14-Day Window, Denormalizzazione Rating, Fix RLS

-- ========================================
-- PARTE 1: Denormalizzazione Rating
-- ========================================

-- Add cached rating columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cached_avg_rating NUMERIC(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cached_review_count INTEGER DEFAULT 0;

-- Add cached rating columns to spaces
ALTER TABLE public.spaces
ADD COLUMN IF NOT EXISTS cached_avg_rating NUMERIC(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cached_review_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_cached_rating ON public.profiles(cached_avg_rating) WHERE cached_avg_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spaces_cached_rating ON public.spaces(cached_avg_rating) WHERE cached_avg_rating IS NOT NULL;

-- ========================================
-- PARTE 2: Trigger per aggiornamento rating utenti
-- ========================================

CREATE OR REPLACE FUNCTION public.update_user_avg_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  new_avg NUMERIC;
  review_count INTEGER;
BEGIN
  -- Determina l'utente target
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.target_id;
  ELSE
    target_user_id := NEW.target_id;
  END IF;

  -- Calcola nuovo rating medio e conteggio
  SELECT 
    ROUND(AVG(rating), 2),
    COUNT(*)
  INTO new_avg, review_count
  FROM public.booking_reviews
  WHERE target_id = target_user_id
    AND is_visible = TRUE;

  -- Aggiorna profiles
  UPDATE public.profiles
  SET 
    cached_avg_rating = new_avg,
    cached_review_count = review_count,
    updated_at = NOW()
  WHERE id = target_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger per INSERT/UPDATE/DELETE su booking_reviews
DROP TRIGGER IF EXISTS trigger_update_user_rating_on_review_change ON public.booking_reviews;
CREATE TRIGGER trigger_update_user_rating_on_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.booking_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_user_avg_rating();

-- ========================================
-- PARTE 3: Trigger per aggiornamento rating spaces
-- ========================================

CREATE OR REPLACE FUNCTION public.update_space_avg_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  space_id_var UUID;
  new_avg NUMERIC;
  review_count INTEGER;
BEGIN
  -- Ottieni space_id dalla prenotazione
  IF TG_OP = 'DELETE' THEN
    SELECT space_id INTO space_id_var
    FROM public.bookings
    WHERE id = OLD.booking_id;
  ELSE
    SELECT space_id INTO space_id_var
    FROM public.bookings
    WHERE id = NEW.booking_id;
  END IF;

  IF space_id_var IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calcola rating medio dalle recensioni dello space
  SELECT 
    ROUND(AVG(br.rating), 2),
    COUNT(*)
  INTO new_avg, review_count
  FROM public.booking_reviews br
  JOIN public.bookings b ON b.id = br.booking_id
  WHERE b.space_id = space_id_var
    AND br.is_visible = TRUE;

  -- Aggiorna spaces
  UPDATE public.spaces
  SET 
    cached_avg_rating = new_avg,
    cached_review_count = review_count,
    updated_at = NOW()
  WHERE id = space_id_var;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger per INSERT/UPDATE/DELETE su booking_reviews
DROP TRIGGER IF EXISTS trigger_update_space_rating_on_review_change ON public.booking_reviews;
CREATE TRIGGER trigger_update_space_rating_on_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.booking_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_space_avg_rating();

-- ========================================
-- PARTE 4: Popola valori iniziali cached
-- ========================================

-- Popola cached_avg_rating e cached_review_count per profiles
UPDATE public.profiles p
SET 
  cached_avg_rating = subq.avg_rating,
  cached_review_count = subq.review_count,
  updated_at = NOW()
FROM (
  SELECT 
    target_id,
    ROUND(AVG(rating), 2) as avg_rating,
    COUNT(*) as review_count
  FROM public.booking_reviews
  WHERE is_visible = TRUE
  GROUP BY target_id
) subq
WHERE p.id = subq.target_id;

-- Popola cached_avg_rating e cached_review_count per spaces
UPDATE public.spaces s
SET 
  cached_avg_rating = subq.avg_rating,
  cached_review_count = subq.review_count,
  updated_at = NOW()
FROM (
  SELECT 
    b.space_id,
    ROUND(AVG(br.rating), 2) as avg_rating,
    COUNT(*) as review_count
  FROM public.booking_reviews br
  JOIN public.bookings b ON b.id = br.booking_id
  WHERE br.is_visible = TRUE
  GROUP BY b.space_id
) subq
WHERE s.id = subq.space_id;

-- ========================================
-- PARTE 5: Validazione 14-Day Window
-- ========================================

-- Update validate_booking_review_insert trigger to enforce 14-day window
CREATE OR REPLACE FUNCTION public.validate_booking_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record RECORD;
  review_deadline TIMESTAMPTZ;
BEGIN
  -- Get booking details
  SELECT 
    b.*,
    b.booking_date + b.end_time AS booking_end_datetime
  INTO booking_record
  FROM public.bookings b
  WHERE b.id = NEW.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Check booking is completed (served)
  IF booking_record.status != 'served' THEN
    RAISE EXCEPTION 'Cannot review: booking not completed (status: %)', booking_record.status;
  END IF;

  -- Calculate review deadline (14 days after booking end_time)
  review_deadline := booking_record.booking_end_datetime + INTERVAL '14 days';

  -- Check 24-hour eligibility (must wait 24h after booking end)
  IF NOW() < booking_record.booking_end_datetime + INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Cannot review yet: must wait 24 hours after booking completion';
  END IF;

  -- Check 14-day window
  IF NOW() > review_deadline THEN
    RAISE EXCEPTION 'Cannot review: 14-day review window expired (deadline: %)', review_deadline;
  END IF;

  -- Check author is participant
  IF NEW.author_id != booking_record.user_id AND 
     NEW.author_id != (SELECT host_id FROM public.spaces WHERE id = booking_record.space_id) THEN
    RAISE EXCEPTION 'Only booking participants can write reviews';
  END IF;

  -- Check target is the other participant
  IF NEW.author_id = booking_record.user_id THEN
    -- Coworker reviewing host
    IF NEW.target_id != (SELECT host_id FROM public.spaces WHERE id = booking_record.space_id) THEN
      RAISE EXCEPTION 'Target must be the host';
    END IF;
  ELSE
    -- Host reviewing coworker
    IF NEW.target_id != booking_record.user_id THEN
      RAISE EXCEPTION 'Target must be the coworker';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ========================================
-- PARTE 6: Fix RLS Policies per Privacy
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view visible reviews" ON public.booking_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.booking_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.booking_reviews;

-- SELECT: Solo recensioni visibili o proprie
CREATE POLICY "booking_reviews_select_policy" ON public.booking_reviews
FOR SELECT
USING (
  is_visible = TRUE 
  OR author_id = auth.uid() 
  OR target_id = auth.uid()
  OR is_admin(auth.uid())
);

-- INSERT: Solo partecipanti della prenotazione
CREATE POLICY "booking_reviews_insert_policy" ON public.booking_reviews
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND (
    -- Author is coworker
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = booking_id AND user_id = auth.uid()
    )
    OR
    -- Author is host
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.spaces s ON s.id = b.space_id
      WHERE b.id = booking_id AND s.host_id = auth.uid()
    )
  )
);

-- UPDATE: Solo proprie recensioni, entro 48h dalla creazione
CREATE POLICY "booking_reviews_update_policy" ON public.booking_reviews
FOR UPDATE
USING (
  author_id = auth.uid()
  AND created_at > NOW() - INTERVAL '48 hours'
)
WITH CHECK (
  author_id = auth.uid()
);

-- DELETE: Solo admin
CREATE POLICY "booking_reviews_delete_policy" ON public.booking_reviews
FOR DELETE
USING (is_admin(auth.uid()));