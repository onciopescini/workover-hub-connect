-- Fix booking_status type cast in validate_and_reserve_slot function
CREATE OR REPLACE FUNCTION public.validate_and_reserve_slot(
  space_id_param uuid,
  date_param date,
  start_time_param time,
  end_time_param time,
  user_id_param uuid,
  guests_count_param integer DEFAULT 1,
  confirmation_type_param text DEFAULT 'instant'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  space_record RECORD;
  booking_id uuid;
  conflicts_count integer;
  reservation_expires_at timestamp with time zone;
BEGIN
  -- Get space details with host info
  SELECT 
    s.*,
    p.stripe_connected,
    p.stripe_account_id
  INTO space_record
  FROM spaces s
  LEFT JOIN profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param 
    AND s.published = true 
    AND s.is_suspended = false;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Space not available or host not connected to Stripe'
    );
  END IF;

  -- Validate guests count against max capacity
  IF guests_count_param > space_record.max_capacity THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Number of guests exceeds maximum capacity (' || space_record.max_capacity || ')'
    );
  END IF;

  -- Check for conflicts with existing bookings
  SELECT COUNT(*) INTO conflicts_count
  FROM bookings
  WHERE space_id = space_id_param
    AND booking_date = date_param
    AND status IN ('confirmed', 'pending')
    AND (
      (start_time <= start_time_param AND end_time > start_time_param) OR
      (start_time < end_time_param AND end_time >= end_time_param) OR
      (start_time >= start_time_param AND end_time <= end_time_param)
    );

  IF conflicts_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Selected time slot is already booked or conflicts with existing booking'
    );
  END IF;

  -- Set reservation expiry (15 minutes from now)
  reservation_expires_at := now() + interval '15 minutes';

  -- Create booking with slot reservation
  INSERT INTO bookings (
    space_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    guests_count,
    status,
    payment_required,
    slot_reserved_until
  ) VALUES (
    space_id_param,
    user_id_param,
    date_param,
    start_time_param,
    end_time_param,
    guests_count_param,
    CASE WHEN confirmation_type_param = 'instant' THEN 'pending'::booking_status ELSE 'pending'::booking_status END,
    true,
    reservation_expires_at
  ) RETURNING id INTO booking_id;

  -- Return success with booking details
  RETURN json_build_object(
    'success', true,
    'booking_id', booking_id,
    'reservation_token', gen_random_uuid(),
    'reserved_until', reservation_expires_at,
    'space_title', space_record.title,
    'confirmation_type', confirmation_type_param
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unexpected error: ' || SQLERRM
    );
END;
$$;