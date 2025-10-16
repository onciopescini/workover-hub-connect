-- FASE 12: Shared Capacity Validation Enhancement
-- Create function to validate total capacity for overlapping bookings

CREATE OR REPLACE FUNCTION public.validate_booking_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  space_max_capacity INTEGER;
  total_guests INTEGER;
BEGIN
  -- Skip validation for cancelled bookings
  IF NEW.status NOT IN ('pending', 'confirmed', 'pending_payment', 'pending_approval') THEN
    RETURN NEW;
  END IF;
  
  -- Get space max capacity
  SELECT max_capacity INTO space_max_capacity
  FROM public.spaces
  WHERE id = NEW.space_id;
  
  IF space_max_capacity IS NULL THEN
    RAISE EXCEPTION 'Space not found or max_capacity not set';
  END IF;
  
  -- Calculate total guests for overlapping time slots
  -- Exclude the current booking if it's an update (using NEW.id)
  SELECT COALESCE(SUM(guests_count), 0) INTO total_guests
  FROM public.bookings
  WHERE space_id = NEW.space_id
    AND booking_date = NEW.booking_date
    AND status IN ('pending', 'confirmed', 'pending_payment', 'pending_approval')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND start_time < NEW.end_time
    AND end_time > NEW.start_time;
  
  -- Add the new/updated booking's guest count
  total_guests := total_guests + NEW.guests_count;
  
  -- Validate capacity
  IF total_guests > space_max_capacity THEN
    RAISE EXCEPTION 'Capacity exceeded: space allows % guests, but % guests would be booked for this time slot (% existing + % new)',
      space_max_capacity, total_guests, total_guests - NEW.guests_count, NEW.guests_count;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_booking_capacity_trigger ON public.bookings;

-- Create trigger to validate capacity on INSERT and UPDATE
CREATE TRIGGER validate_booking_capacity_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_capacity();

-- Add helpful comment
COMMENT ON FUNCTION public.validate_booking_capacity() IS 
  'Validates that total guests for overlapping bookings do not exceed space max_capacity. 
   Considers bookings with status: pending, confirmed, pending_payment, pending_approval.
   Raises exception if capacity would be exceeded.';