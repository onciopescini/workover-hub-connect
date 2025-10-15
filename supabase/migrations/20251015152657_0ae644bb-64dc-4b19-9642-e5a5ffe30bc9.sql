-- Fix A.4: Cron race condition prevention with processing locks
-- Prevents booking-expiry-check and booking-reminders from processing same booking

-- 1. Add processing lock column
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS processing_lock timestamptz DEFAULT NULL;

-- 2. Add index for lock queries
CREATE INDEX idx_bookings_processing_lock 
ON public.bookings(processing_lock) 
WHERE processing_lock IS NOT NULL;

-- 3. Function to lock and select expired bookings
CREATE OR REPLACE FUNCTION public.lock_and_select_expired_bookings(
  p_lock_duration_minutes integer DEFAULT 10
)
RETURNS SETOF public.bookings AS $$
BEGIN
  RETURN QUERY
  UPDATE public.bookings
  SET processing_lock = NOW()
  WHERE id IN (
    SELECT id FROM public.bookings
    WHERE status = 'pending'
      AND slot_reserved_until < NOW()
      AND payment_required = true
      AND (
        processing_lock IS NULL 
        OR processing_lock < NOW() - (p_lock_duration_minutes || ' minutes')::interval
      )
    FOR UPDATE SKIP LOCKED
    LIMIT 100
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to lock and select reminder bookings
CREATE OR REPLACE FUNCTION public.lock_and_select_reminder_bookings(
  p_lock_duration_minutes integer DEFAULT 10
)
RETURNS SETOF public.bookings AS $$
DECLARE
  tomorrow date := CURRENT_DATE + 1;
  day_after_tomorrow date := CURRENT_DATE + 2;
BEGIN
  RETURN QUERY
  UPDATE public.bookings
  SET processing_lock = NOW()
  WHERE id IN (
    SELECT id FROM public.bookings
    WHERE status IN ('pending_approval', 'confirmed')
      AND booking_date >= tomorrow
      AND booking_date < day_after_tomorrow
      AND (
        processing_lock IS NULL 
        OR processing_lock < NOW() - (p_lock_duration_minutes || ' minutes')::interval
      )
    FOR UPDATE SKIP LOCKED
    LIMIT 100
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to unlock bookings after processing
CREATE OR REPLACE FUNCTION public.unlock_bookings(booking_ids uuid[])
RETURNS void AS $$
BEGIN
  UPDATE public.bookings
  SET processing_lock = NULL,
      updated_at = NOW()
  WHERE id = ANY(booking_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;