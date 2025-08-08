-- Phase 4: Review & Reputation System - DB validation and edit/delete windows
-- 1) Unique review per booking per author
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_reviews_unique_author_per_booking
ON public.booking_reviews (booking_id, author_id);

-- 2) Validation function for booking reviews
CREATE OR REPLACE FUNCTION public.validate_booking_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  b_booking_date date;
  b_user_id uuid;
  b_host_id uuid;
  expected_target uuid;
BEGIN
  -- Ensure booking exists and fetch details
  SELECT b.booking_date, b.user_id, s.host_id
  INTO b_booking_date, b_user_id, b_host_id
  FROM public.bookings b
  JOIN public.spaces s ON s.id = b.space_id
  WHERE b.id = NEW.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid booking_id: booking not found';
  END IF;

  -- Rating must be between 1 and 5
  IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Content max length 500
  IF NEW.content IS NOT NULL AND length(NEW.content) > 500 THEN
    RAISE EXCEPTION 'Content must be 500 characters or less';
  END IF;

  -- Author must be booking user or host
  IF NEW.author_id <> b_user_id AND NEW.author_id <> b_host_id THEN
    RAISE EXCEPTION 'Author not related to this booking';
  END IF;

  -- Target must be the counterparty
  expected_target := CASE WHEN NEW.author_id = b_user_id THEN b_host_id ELSE b_user_id END;
  IF NEW.target_id <> expected_target THEN
    RAISE EXCEPTION 'Target must be the counterparty of the booking';
  END IF;

  -- Reviews only after booking date
  IF b_booking_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Reviews can be written only after the booking date';
  END IF;

  -- Review window: within 14 days after booking date
  IF now()::date > (b_booking_date + interval '14 days')::date THEN
    RAISE EXCEPTION 'The review window has expired (14 days after booking date)';
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Enforce 1-hour edit/delete window
CREATE OR REPLACE FUNCTION public.enforce_booking_review_edit_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE')
     AND now() > (COALESCE(OLD.created_at, now()) + interval '1 hour') THEN
    RAISE EXCEPTION 'You can % reviews only within 1 hour of creation', lower(TG_OP);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  ELSE
    RETURN OLD;
  END IF;
END;
$$;

-- 4) Triggers (idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_booking_reviews_validate') THEN
    CREATE TRIGGER trg_booking_reviews_validate
    BEFORE INSERT ON public.booking_reviews
    FOR EACH ROW EXECUTE FUNCTION public.validate_booking_review();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_booking_reviews_edit_window') THEN
    CREATE TRIGGER trg_booking_reviews_edit_window
    BEFORE UPDATE OR DELETE ON public.booking_reviews
    FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_review_edit_window();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_booking_reviews_updated_at') THEN
    CREATE TRIGGER trg_booking_reviews_updated_at
    BEFORE UPDATE ON public.booking_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;