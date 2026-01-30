-- ACTION 1: Fix Critical RLS Vulnerability on space_reviews
-- Drop the old weak policy that only checks author_id
DROP POLICY IF EXISTS "space_reviews_insert_by_author" ON public.space_reviews;
DROP POLICY IF EXISTS "space_reviews_insert_verified" ON public.space_reviews;

-- Create secure INSERT policy that verifies booking participation
CREATE POLICY "space_reviews_insert_verified" ON public.space_reviews
FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = space_reviews.booking_id
    AND b.user_id = auth.uid()
    AND b.space_id = space_reviews.space_id
    AND b.status IN ('served', 'confirmed', 'checked_in')
    AND (b.end_time IS NULL OR b.end_time < NOW())
  )
);

-- ACTION 2: Align Review Trigger Logic for booking_reviews
-- Update the trigger function to accept confirmed/checked_in bookings with passed end_time
CREATE OR REPLACE FUNCTION public.validate_review_submission_aligned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
BEGIN
  -- Fetch the booking details
  SELECT status, end_time, user_id, space_id
  INTO v_booking
  FROM public.bookings
  WHERE id = NEW.booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Check if booking is in a reviewable state
  -- Option 1: Already marked as served (ideal)
  -- Option 2: Confirmed/checked_in AND end_time has passed
  IF v_booking.status = 'served' THEN
    RETURN NEW;
  ELSIF v_booking.status IN ('confirmed', 'checked_in') AND v_booking.end_time IS NOT NULL AND v_booking.end_time < NOW() THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Booking not eligible for review. Status: %, End time: %', v_booking.status, v_booking.end_time;
  END IF;
END;
$$;

-- Drop the old trigger and create new one with aligned logic
DROP TRIGGER IF EXISTS trg_validate_review_submission_simple ON public.booking_reviews;
DROP TRIGGER IF EXISTS trg_validate_review_submission_aligned ON public.booking_reviews;

CREATE TRIGGER trg_validate_review_submission_aligned
  BEFORE INSERT ON public.booking_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_review_submission_aligned();

-- Also apply aligned validation to the unified reviews table
DROP TRIGGER IF EXISTS trg_validate_reviews_aligned ON public.reviews;

CREATE TRIGGER trg_validate_reviews_aligned
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_review_submission_aligned();