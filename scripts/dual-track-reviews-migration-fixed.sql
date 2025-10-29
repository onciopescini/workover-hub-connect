-- =====================================================
-- DUAL-TRACK REVIEW SYSTEM MIGRATION (FIXED VERSION)
-- =====================================================
-- This migration:
-- 1. Removes deprecated event_reviews table and related objects
-- 2. Fixes booking_reviews visibility trigger (removes circular dependency bug)
-- 3. Creates space_reviews table for COWORKER → SPACE reviews
-- 4. Sets up RLS policies, triggers, and RPC functions
-- 5. Renames existing functions for clarity
-- =====================================================

BEGIN;

-- =====================================================
-- PHASE 1: CLEANUP LEGACY (event_reviews)
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🧹 PHASE 1: Cleaning up deprecated event_reviews table...';
END $$;

-- Drop all triggers on event_reviews
DROP TRIGGER IF EXISTS trigger_check_event_review_visibility ON public.event_reviews CASCADE;
DROP TRIGGER IF EXISTS trigger_event_review_notification ON public.event_reviews CASCADE;
DROP TRIGGER IF EXISTS trigger_event_reviews_updated_at ON public.event_reviews CASCADE;

-- Drop event_participants table if exists (foreign key dependency)
DROP TABLE IF EXISTS public.event_participants CASCADE;

-- Drop events table if it references event_reviews
DROP TABLE IF EXISTS public.events CASCADE;

-- Drop event_reviews table
DROP TABLE IF EXISTS public.event_reviews CASCADE;

DO $$ 
BEGIN
  RAISE NOTICE '✅ event_reviews and related tables dropped successfully';
END $$;

-- =====================================================
-- PHASE 2: FIX booking_reviews TRIGGER
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 PHASE 2: Fixing booking_reviews visibility trigger...';
END $$;

-- Drop existing trigger on booking_reviews
DROP TRIGGER IF EXISTS trigger_check_booking_review_visibility ON public.booking_reviews CASCADE;

-- Drop old function (now safe, no more event_reviews dependency)
DROP FUNCTION IF EXISTS public.check_mutual_review_visibility() CASCADE;

-- Recreate function with CORRECTED LOGIC (fixes circular dependency bug)
CREATE OR REPLACE FUNCTION public.check_mutual_review_visibility()
RETURNS TRIGGER AS $$
DECLARE
  other_review_exists BOOLEAN;
  other_review_id UUID;
BEGIN
  -- First, check if review is older than 14 days → auto-visible
  IF NEW.created_at < now() - INTERVAL '14 days' THEN
    NEW.is_visible := true;
    RETURN NEW;
  END IF;

  -- Check if the reciprocal review exists (WITHOUT checking is_visible to avoid circular dependency)
  SELECT id INTO other_review_id
  FROM booking_reviews
  WHERE booking_id = NEW.booking_id
    AND author_id = NEW.target_id
    AND target_id = NEW.author_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  LIMIT 1;

  -- If both reviews exist, make both visible (mutual visibility)
  IF other_review_id IS NOT NULL THEN
    NEW.is_visible := true;
    
    -- Update the other review to be visible too
    UPDATE booking_reviews
    SET is_visible = true,
        updated_at = now()
    WHERE id = other_review_id
      AND is_visible = false;  -- Only update if not already visible
  ELSE
    -- If no reciprocal review yet, keep hidden until 14 days pass
    NEW.is_visible := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger on booking_reviews
CREATE TRIGGER trigger_check_booking_review_visibility
BEFORE INSERT OR UPDATE ON public.booking_reviews
FOR EACH ROW
EXECUTE FUNCTION public.check_mutual_review_visibility();

DO $$ 
BEGIN
  RAISE NOTICE '✅ booking_reviews trigger fixed successfully';
END $$;

-- =====================================================
-- PHASE 3: CREATE space_reviews TABLE
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🏗️  PHASE 3: Creating space_reviews table...';
END $$;

-- Create space_reviews table for COWORKER → SPACE reviews
CREATE TABLE IF NOT EXISTS public.space_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT space_reviews_unique_booking UNIQUE (booking_id, author_id),
  CONSTRAINT space_reviews_author_is_coworker CHECK (
    author_id IN (
      SELECT user_id FROM bookings WHERE id = booking_id
    )
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_space_reviews_space_id ON public.space_reviews(space_id);
CREATE INDEX IF NOT EXISTS idx_space_reviews_author_id ON public.space_reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_space_reviews_booking_id ON public.space_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_space_reviews_visible ON public.space_reviews(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_space_reviews_rating ON public.space_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_space_reviews_created_at ON public.space_reviews(created_at DESC);

DO $$ 
BEGIN
  RAISE NOTICE '✅ space_reviews table created with indexes';
END $$;

-- =====================================================
-- PHASE 4: RLS POLICIES for space_reviews
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔐 PHASE 4: Setting up RLS policies for space_reviews...';
END $$;

-- Enable RLS
ALTER TABLE public.space_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Anyone can view visible reviews OR author/host can view their own
CREATE POLICY space_reviews_select_policy ON public.space_reviews
  FOR SELECT
  USING (
    is_visible = true
    OR author_id = auth.uid()
    OR space_id IN (
      SELECT id FROM spaces WHERE host_id = auth.uid()
    )
    OR (SELECT is_admin(auth.uid()))
  );

-- Policy: INSERT - Only coworkers can create reviews for their bookings
CREATE POLICY space_reviews_insert_policy ON public.space_reviews
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
        AND bookings.user_id = auth.uid()
        AND bookings.status = 'served'
    )
  );

-- Policy: UPDATE - Only author can update within 48 hours
CREATE POLICY space_reviews_update_policy ON public.space_reviews
  FOR UPDATE
  USING (
    author_id = auth.uid()
    AND created_at > now() - INTERVAL '48 hours'
  )
  WITH CHECK (
    author_id = auth.uid()
  );

-- Policy: DELETE - Only admins can delete
CREATE POLICY space_reviews_delete_policy ON public.space_reviews
  FOR DELETE
  USING (
    (SELECT is_admin(auth.uid()))
  );

DO $$ 
BEGIN
  RAISE NOTICE '✅ RLS policies created successfully';
END $$;

-- =====================================================
-- PHASE 5: TRIGGERS for space_reviews
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '⚡ PHASE 5: Creating triggers for space_reviews...';
END $$;

-- Trigger: Auto-visibility after 14 days
CREATE OR REPLACE FUNCTION public.auto_show_space_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at < now() - INTERVAL '14 days' THEN
    NEW.is_visible := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auto_show_space_review
BEFORE INSERT OR UPDATE ON public.space_reviews
FOR EACH ROW
EXECUTE FUNCTION public.auto_show_space_review();

-- Trigger: Update updated_at timestamp
CREATE TRIGGER trigger_space_reviews_updated_at
BEFORE UPDATE ON public.space_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DO $$ 
BEGIN
  RAISE NOTICE '✅ Triggers created successfully';
END $$;

-- =====================================================
-- PHASE 6: RPC FUNCTIONS for space_reviews
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '📡 PHASE 6: Creating RPC functions for space_reviews...';
END $$;

-- Function: Get all reviews for a space with author details
CREATE OR REPLACE FUNCTION public.get_space_reviews(p_space_id UUID)
RETURNS TABLE (
  id UUID,
  booking_id UUID,
  space_id UUID,
  author_id UUID,
  rating INTEGER,
  content TEXT,
  is_visible BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  author_first_name TEXT,
  author_last_name TEXT,
  author_profile_photo_url TEXT,
  booking_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.booking_id,
    sr.space_id,
    sr.author_id,
    sr.rating,
    sr.content,
    sr.is_visible,
    sr.created_at,
    sr.updated_at,
    p.first_name as author_first_name,
    p.last_name as author_last_name,
    p.profile_photo_url as author_profile_photo_url,
    b.booking_date
  FROM space_reviews sr
  JOIN profiles p ON p.id = sr.author_id
  JOIN bookings b ON b.id = sr.booking_id
  WHERE sr.space_id = p_space_id
    AND sr.is_visible = true
  ORDER BY sr.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function: Calculate weighted rating for a space
CREATE OR REPLACE FUNCTION public.calculate_space_weighted_rating(p_space_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_reviews INTEGER;
  sum_ratings NUMERIC;
  avg_rating NUMERIC;
  weighted_rating NUMERIC;
  baseline_rating CONSTANT NUMERIC := 3.5;
  confidence_threshold CONSTANT INTEGER := 10;
BEGIN
  -- Count visible reviews
  SELECT COUNT(*), COALESCE(SUM(rating), 0)
  INTO total_reviews, sum_ratings
  FROM space_reviews
  WHERE space_id = p_space_id
    AND is_visible = true;

  -- If no reviews, return 0
  IF total_reviews = 0 THEN
    RETURN 0;
  END IF;

  -- Calculate simple average
  avg_rating := sum_ratings / total_reviews;

  -- Apply Bayesian average (weighted towards baseline until enough reviews)
  weighted_rating := (
    (confidence_threshold * baseline_rating + sum_ratings) / 
    (confidence_threshold + total_reviews)
  );

  -- Return rounded to 1 decimal
  RETURN ROUND(weighted_rating, 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function: Get review status for a booking
CREATE OR REPLACE FUNCTION public.get_space_review_status(
  p_booking_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  can_write_review BOOLEAN,
  has_written_review BOOLEAN,
  is_visible BOOLEAN,
  days_until_visible INTEGER
) AS $$
DECLARE
  booking_status TEXT;
  review_record RECORD;
BEGIN
  -- Check if booking exists and is served
  SELECT b.status INTO booking_status
  FROM bookings b
  WHERE b.id = p_booking_id
    AND b.user_id = p_user_id;

  -- Can write review only if booking is served
  IF booking_status IS NULL OR booking_status != 'served' THEN
    RETURN QUERY SELECT false, false, false, 0;
    RETURN;
  END IF;

  -- Check if user has already written a review
  SELECT sr.is_visible, sr.created_at
  INTO review_record
  FROM space_reviews sr
  WHERE sr.booking_id = p_booking_id
    AND sr.author_id = p_user_id;

  -- If no review exists
  IF review_record IS NULL THEN
    RETURN QUERY SELECT true, false, false, 0;
    RETURN;
  END IF;

  -- If review exists, calculate days until visible
  DECLARE
    days_passed INTEGER;
    days_remaining INTEGER;
  BEGIN
    days_passed := EXTRACT(DAY FROM (now() - review_record.created_at));
    days_remaining := GREATEST(0, 14 - days_passed);

    RETURN QUERY SELECT 
      false, 
      true, 
      review_record.is_visible,
      days_remaining;
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

DO $$ 
BEGIN
  RAISE NOTICE '✅ RPC functions created successfully';
END $$;

-- =====================================================
-- PHASE 7: RENAME EXISTING FUNCTIONS FOR CLARITY
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 PHASE 7: Renaming existing functions for clarity...';
END $$;

-- Rename existing booking review functions to be explicit
DROP FUNCTION IF EXISTS public.get_booking_review_status(UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.get_booking_review_status(
  p_booking_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  can_write_review BOOLEAN,
  has_written_review BOOLEAN,
  has_received_review BOOLEAN,
  is_visible BOOLEAN,
  days_until_visible INTEGER
) AS $$
DECLARE
  booking_exists BOOLEAN;
  user_review RECORD;
  other_user_id UUID;
  other_review_exists BOOLEAN;
BEGIN
  -- Check if booking exists and user is part of it
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = p_booking_id
      AND (b.user_id = p_user_id OR b.space_id IN (
        SELECT id FROM spaces WHERE host_id = p_user_id
      ))
  ) INTO booking_exists;

  IF NOT booking_exists THEN
    RETURN QUERY SELECT false, false, false, false, 0;
    RETURN;
  END IF;

  -- Get other user ID
  SELECT CASE 
    WHEN b.user_id = p_user_id THEN s.host_id
    ELSE b.user_id
  END INTO other_user_id
  FROM bookings b
  JOIN spaces s ON s.id = b.space_id
  WHERE b.id = p_booking_id;

  -- Check if user has written a review
  SELECT br.is_visible, br.created_at
  INTO user_review
  FROM booking_reviews br
  WHERE br.booking_id = p_booking_id
    AND br.author_id = p_user_id
    AND br.target_id = other_user_id;

  -- Check if user has received a review
  SELECT EXISTS (
    SELECT 1 FROM booking_reviews br
    WHERE br.booking_id = p_booking_id
      AND br.author_id = other_user_id
      AND br.target_id = p_user_id
  ) INTO other_review_exists;

  -- If no review written yet
  IF user_review IS NULL THEN
    RETURN QUERY SELECT 
      true,  -- can_write_review
      false, -- has_written_review
      other_review_exists, -- has_received_review
      false, -- is_visible
      0;     -- days_until_visible
    RETURN;
  END IF;

  -- If review exists, calculate visibility
  DECLARE
    days_passed INTEGER;
    days_remaining INTEGER;
  BEGIN
    days_passed := EXTRACT(DAY FROM (now() - user_review.created_at));
    days_remaining := GREATEST(0, 14 - days_passed);

    RETURN QUERY SELECT 
      false, -- can_write_review (already written)
      true,  -- has_written_review
      other_review_exists, -- has_received_review
      user_review.is_visible, -- is_visible
      days_remaining; -- days_until_visible
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

DO $$ 
BEGIN
  RAISE NOTICE '✅ Functions renamed successfully';
END $$;

-- =====================================================
-- PHASE 8: VERIFICATION
-- =====================================================

DO $$ 
DECLARE
  event_reviews_exists INTEGER;
  space_reviews_exists INTEGER;
  booking_trigger_exists INTEGER;
BEGIN
  RAISE NOTICE '🔍 PHASE 8: Verifying migration...';

  -- Check event_reviews is gone
  SELECT COUNT(*) INTO event_reviews_exists
  FROM pg_tables 
  WHERE tablename = 'event_reviews' AND schemaname = 'public';
  
  IF event_reviews_exists = 0 THEN
    RAISE NOTICE '✅ event_reviews table removed successfully';
  ELSE
    RAISE EXCEPTION '❌ event_reviews table still exists!';
  END IF;

  -- Check space_reviews is created
  SELECT COUNT(*) INTO space_reviews_exists
  FROM pg_tables 
  WHERE tablename = 'space_reviews' AND schemaname = 'public';
  
  IF space_reviews_exists = 1 THEN
    RAISE NOTICE '✅ space_reviews table created successfully';
  ELSE
    RAISE EXCEPTION '❌ space_reviews table not created!';
  END IF;

  -- Check booking_reviews trigger exists
  SELECT COUNT(*) INTO booking_trigger_exists
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'booking_reviews' 
    AND t.tgname = 'trigger_check_booking_review_visibility';
  
  IF booking_trigger_exists = 1 THEN
    RAISE NOTICE '✅ booking_reviews trigger recreated successfully';
  ELSE
    RAISE EXCEPTION '❌ booking_reviews trigger not found!';
  END IF;

  RAISE NOTICE '✅✅✅ Dual-track review system migration completed successfully! ✅✅✅';
END $$;

COMMIT;
