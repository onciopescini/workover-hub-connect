-- Ensure columns exist on profiles (Idempotent)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cached_avg_rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cached_review_count INTEGER DEFAULT 0;

-- Create or Replace get_coworkers function with rating support
CREATE OR REPLACE FUNCTION public.get_coworkers(_booking_id UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  profession TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  cached_avg_rating NUMERIC,
  cached_review_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _space_id UUID;
  _booking_date DATE;
  _start_time TIME;
  _end_time TIME;
  _user_id UUID;
BEGIN
  -- Get reference booking details
  SELECT space_id, booking_date, start_time, end_time, user_id
  INTO _space_id, _booking_date, _start_time, _end_time, _user_id
  FROM public.bookings
  WHERE id = _booking_id;

  -- Return empty if booking not found
  IF _space_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.first_name,
    p.last_name,
    p.profession,
    p.profile_photo_url as avatar_url,
    p.linkedin_url,
    COALESCE(p.cached_avg_rating, 0) as cached_avg_rating,
    COALESCE(p.cached_review_count, 0) as cached_review_count
  FROM public.bookings b
  JOIN public.profiles p ON b.user_id = p.id
  WHERE b.space_id = _space_id
    AND b.booking_date = _booking_date
    AND b.status IN ('confirmed', 'served')
    AND b.user_id != _user_id
    -- Time overlap logic: (StartA <= EndB) and (EndA >= StartB)
    AND b.start_time < _end_time
    AND b.end_time > _start_time;
END;
$$;

-- Function to update Profile ratings (from Booking Reviews)
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS TRIGGER AS $$
DECLARE
    _target_id UUID;
BEGIN
    -- Determine target_id based on operation
    IF (TG_OP = 'DELETE') THEN
        _target_id := OLD.target_id;
    ELSE
        _target_id := NEW.target_id;
    END IF;

    -- Update the profile cache
    UPDATE public.profiles
    SET
        cached_avg_rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
            FROM public.booking_reviews
            WHERE target_id = _target_id
        ),
        cached_review_count = (
            SELECT COUNT(*)
            FROM public.booking_reviews
            WHERE target_id = _target_id
        )
    WHERE id = _target_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Booking Reviews
DROP TRIGGER IF EXISTS on_booking_review_change ON public.booking_reviews;
CREATE TRIGGER on_booking_review_change
AFTER INSERT OR UPDATE OR DELETE ON public.booking_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_profile_rating();
