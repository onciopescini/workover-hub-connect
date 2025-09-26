-- Fix the variable naming conflict in validate_booking_review_insert trigger
-- The issue is that 'b' is used both as table alias and as INTO variable name

CREATE OR REPLACE FUNCTION public.validate_booking_review_insert()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  review_period_days INTEGER := 14;
BEGIN
  -- Get booking details with space and host info
  SELECT b.*, s.host_id INTO booking_record
  FROM public.bookings b
  JOIN public.spaces s ON s.id = b.space_id
  WHERE b.id = NEW.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Check if booking is completed and paid
  IF booking_record.status != 'confirmed' THEN
    RAISE EXCEPTION 'Can only review confirmed bookings';
  END IF;

  -- Check if booking date has passed
  IF booking_record.booking_date >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot review booking before completion date';
  END IF;

  -- Check if payment is completed
  IF NOT EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.booking_id = NEW.booking_id
    AND p.payment_status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Cannot review booking without completed payment';
  END IF;

  -- Validate author is part of the booking
  IF NEW.author_id != booking_record.user_id AND NEW.author_id != booking_record.host_id THEN
    RAISE EXCEPTION 'Only booking participants can write reviews';
  END IF;

  -- Validate target is part of the booking and different from author
  IF NEW.target_id != booking_record.user_id AND NEW.target_id != booking_record.host_id THEN
    RAISE EXCEPTION 'Can only review booking participants';
  END IF;

  IF NEW.author_id = NEW.target_id THEN
    RAISE EXCEPTION 'Cannot review yourself';
  END IF;

  -- Set visibility based on review age (visible after 14 days)
  IF booking_record.booking_date >= CURRENT_DATE - INTERVAL '14 days' THEN
    NEW.is_visible := FALSE;
  ELSE
    NEW.is_visible := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;