-- =====================================================
-- P4: RPC Enhancement - validate_and_reserve_slot
-- =====================================================
-- Use advisory lock instead of table lock for better scalability
-- Integrate self-booking check
-- Filter by deleted_at

CREATE OR REPLACE FUNCTION public.validate_and_reserve_slot(
  space_id_param UUID,
  date_param DATE,
  start_time_param TIME,
  end_time_param TIME,
  user_id_param UUID,
  confirmation_type_param TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  conflict_count INTEGER := 0;
  reservation_time TIMESTAMPTZ := NOW() + INTERVAL '5 minutes';
  new_booking_id UUID;
  space_host_id UUID;
  space_title TEXT;
  space_confirmation_type TEXT;
BEGIN
  -- Basic input validation
  IF space_id_param IS NULL OR date_param IS NULL OR start_time_param IS NULL 
     OR end_time_param IS NULL OR user_id_param IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'missing_required_params'
    );
  END IF;

  -- Validate time range
  IF start_time_param >= end_time_param THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_time_range'
    );
  END IF;

  -- Check self-booking (host cannot book their own space)
  IF public.check_self_booking(space_id_param, user_id_param) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'cannot_book_own_space'
    );
  END IF;

  -- Get space details
  SELECT host_id, title, confirmation_type 
  INTO space_host_id, space_title, space_confirmation_type
  FROM spaces 
  WHERE id = space_id_param 
    AND deleted_at IS NULL
    AND published = true;

  IF space_host_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'space_not_found'
    );
  END IF;

  -- Use row-level advisory lock (scalable - only locks this space+date combo)
  PERFORM pg_advisory_xact_lock(
    hashtext(space_id_param::text || date_param::text)
  );

  -- Cleanup expired reservation slots
  PERFORM cleanup_expired_slots();

  -- Check for conflicts (excluding soft-deleted bookings)
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE space_id = space_id_param
    AND booking_date = date_param
    AND deleted_at IS NULL
    AND status IN ('pending', 'confirmed')
    AND (
      -- Active booking overlaps
      (start_time < end_time_param AND end_time > start_time_param) 
      OR 
      -- Reserved slot overlaps (still within reservation window)
      (slot_reserved_until > NOW() AND start_time < end_time_param AND end_time > start_time_param)
    );

  IF conflict_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'slot_unavailable'
    );
  END IF;

  -- Create booking with reserved slot
  INSERT INTO bookings (
    space_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    status,
    slot_reserved_until,
    created_at,
    updated_at
  ) VALUES (
    space_id_param,
    user_id_param,
    date_param,
    start_time_param,
    end_time_param,
    'pending'::booking_status,
    reservation_time,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'slot_reserved_until', reservation_time,
    'host_id', space_host_id,
    'space_title', space_title,
    'confirmation_type', COALESCE(confirmation_type_param, space_confirmation_type)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'internal_error',
    'message', SQLERRM
  );
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_and_reserve_slot(uuid, date, time, time, uuid, text) TO authenticated;