-- Migration: Fix Search Path for Final 3 Functions
-- Add SET search_path TO 'public' to remaining functions flagged by Supabase Linter

-- Fix 1: validate_booking_payment() - Trigger function
CREATE OR REPLACE FUNCTION public.validate_booking_payment()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Solo quando si passa a 'confirmed'
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Verifica esistenza payment
    IF NOT EXISTS (
      SELECT 1 FROM public.payments 
      WHERE booking_id = NEW.id 
      AND payment_status IN ('completed', 'pending')
    ) THEN
      RAISE EXCEPTION 'Impossibile confermare prenotazione senza pagamento associato. Booking ID: %', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 2: check_payment_integrity() - Utility function
CREATE OR REPLACE FUNCTION public.check_payment_integrity()
RETURNS TABLE(
  booking_id UUID,
  status TEXT,
  booking_date DATE,
  space_title TEXT,
  issue TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    b.status::TEXT,
    b.booking_date,
    s.title as space_title,
    'Booking confirmed without payment' as issue
  FROM public.bookings b
  JOIN public.spaces s ON s.id = b.space_id
  WHERE b.status = 'confirmed'
    AND NOT EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.booking_id = b.id 
      AND p.payment_status IN ('completed', 'pending')
    );
END;
$$;

-- Fix 3: get_spaces_availability_batch() - Batch query function
CREATE OR REPLACE FUNCTION public.get_spaces_availability_batch(
  space_ids uuid[],
  check_date date,
  check_start_time time,
  check_end_time time
)
RETURNS TABLE (
  space_id uuid,
  max_capacity integer,
  booked_capacity integer,
  available_capacity integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as space_id,
    s.max_capacity,
    COALESCE(SUM(b.guests_count), 0)::integer as booked_capacity,
    (s.max_capacity - COALESCE(SUM(b.guests_count), 0))::integer as available_capacity
  FROM public.spaces s
  LEFT JOIN public.bookings b ON b.space_id = s.id
    AND b.booking_date = check_date
    AND b.status IN ('pending', 'confirmed')
    AND b.start_time IS NOT NULL
    AND b.end_time IS NOT NULL
    AND (
      -- Check for time overlap
      (b.start_time < check_end_time AND b.end_time > check_start_time)
    )
  WHERE s.id = ANY(space_ids)
    AND s.published = true
    AND s.deleted_at IS NULL
  GROUP BY s.id, s.max_capacity;
END;
$$;

-- Verification: Check all functions now have search_path set
DO $$
DECLARE
  mutable_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mutable_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND NOT p.proisstrict
    AND p.provolatile != 'i'
    AND prosecdef
    AND p.proname NOT LIKE 'pg_%'
    AND NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    );
  
  IF mutable_count > 0 THEN
    RAISE WARNING '⚠️ Still % function(s) without immutable search_path', mutable_count;
  ELSE
    RAISE NOTICE '✅ All security definer functions now have immutable search_path';
  END IF;
END $$;