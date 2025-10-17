-- Fix booking status validation trigger to allow 'pending_payment' for instant bookings
-- Issue: Trigger was blocking INSERT with 'pending_payment' status

CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_transition BOOLEAN := FALSE;
BEGIN
  -- Allow INSERT (new bookings can start as 'pending', 'pending_approval', or 'pending_payment')
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending', 'pending_approval', 'pending_payment') THEN
      RAISE EXCEPTION 'New bookings must have status "pending", "pending_approval", or "pending_payment"';
    END IF;
    RETURN NEW;
  END IF;

  -- If status unchanged, allow
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate state transitions
  CASE OLD.status
    WHEN 'pending' THEN
      valid_transition := NEW.status IN ('pending_payment', 'pending_approval', 'confirmed', 'cancelled');
    WHEN 'pending_approval' THEN
      valid_transition := NEW.status IN ('pending_payment', 'confirmed', 'cancelled');
    WHEN 'pending_payment' THEN
      valid_transition := NEW.status IN ('confirmed', 'cancelled');
    WHEN 'confirmed' THEN
      valid_transition := NEW.status IN ('served', 'frozen', 'cancelled');
    WHEN 'served' THEN
      valid_transition := FALSE; -- Terminal state
    WHEN 'frozen' THEN
      valid_transition := NEW.status = 'cancelled';
    WHEN 'cancelled' THEN
      valid_transition := FALSE; -- Terminal state
    ELSE
      valid_transition := FALSE;
  END CASE;

  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Invalid booking status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;