-- Complete booking flow logic with dynamic deadline calculation
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
  total_guests_count integer;
  reservation_expires_at timestamp with time zone;
  booking_datetime timestamp with time zone;
  hours_until_booking numeric;
  calculated_approval_deadline timestamp with time zone;
  calculated_payment_deadline timestamp with time zone;
  initial_status booking_status;
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
      'error', 'Spazio non disponibile o host non collegato a Stripe'
    );
  END IF;

  -- Validate guests count against max capacity
  IF guests_count_param > space_record.max_capacity THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Numero di ospiti superiore alla capacità massima (' || space_record.max_capacity || ')'
    );
  END IF;

  -- Check total guests against max capacity for overlapping time slots
  SELECT COALESCE(SUM(guests_count), 0) INTO total_guests_count
  FROM bookings
  WHERE space_id = space_id_param
    AND booking_date = date_param
    AND status IN ('confirmed', 'pending', 'pending_approval', 'pending_payment')
    AND (
      (start_time <= start_time_param AND end_time > start_time_param) OR
      (start_time < end_time_param AND end_time >= end_time_param) OR
      (start_time >= start_time_param AND end_time <= end_time_param)
    );

  -- Check if adding new guests would exceed capacity
  IF total_guests_count + guests_count_param > space_record.max_capacity THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Posti insufficienti. Disponibili: ' || (space_record.max_capacity - total_guests_count) || '/' || space_record.max_capacity,
      'available_spots', space_record.max_capacity - total_guests_count,
      'max_capacity', space_record.max_capacity,
      'requested_spots', guests_count_param
    );
  END IF;

  -- Calculate booking datetime
  booking_datetime := (date_param::text || ' ' || start_time_param::text)::timestamp with time zone;
  
  -- Calculate hours until booking
  hours_until_booking := EXTRACT(EPOCH FROM (booking_datetime - now())) / 3600;
  
  -- Determine initial status and deadlines based on confirmation type
  IF confirmation_type_param = 'instant' THEN
    initial_status := 'pending'::booking_status;
    calculated_approval_deadline := NULL;
    calculated_payment_deadline := now() + interval '15 minutes';
    reservation_expires_at := now() + interval '15 minutes';
  ELSE -- host_approval
    initial_status := 'pending_approval'::booking_status;
    reservation_expires_at := NULL; -- No 15min slot reservation for approval flow
    
    -- Calculate approval deadline
    IF hours_until_booking > 24 THEN
      -- Booking >24h away: host has 24h to respond
      calculated_approval_deadline := now() + interval '24 hours';
    ELSE
      -- Booking <24h away: host has until 2h before booking
      calculated_approval_deadline := booking_datetime - interval '2 hours';
      
      -- Validation: if calculated deadline is too close or in the past, reject
      IF calculated_approval_deadline <= now() + interval '30 minutes' THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Prenotazione troppo vicina. Per prenotazioni sotto le 2.5 ore, usa la conferma istantanea o contatta direttamente l''host.'
        );
      END IF;
    END IF;
    
    calculated_payment_deadline := NULL; -- Will be set when host approves
  END IF;

  -- Create booking with calculated values
  INSERT INTO bookings (
    space_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    guests_count,
    status,
    payment_required,
    slot_reserved_until,
    approval_deadline,
    payment_deadline,
    is_urgent,
    approval_reminder_sent,
    payment_reminder_sent
  ) VALUES (
    space_id_param,
    user_id_param,
    date_param,
    start_time_param,
    end_time_param,
    guests_count_param,
    initial_status,
    true,
    reservation_expires_at,
    calculated_approval_deadline,
    calculated_payment_deadline,
    false,
    false,
    false
  ) RETURNING id INTO booking_id;

  -- Return success with booking details
  RETURN json_build_object(
    'success', true,
    'booking_id', booking_id,
    'reservation_token', gen_random_uuid(),
    'reserved_until', reservation_expires_at,
    'space_title', space_record.title,
    'confirmation_type', confirmation_type_param,
    'remaining_spots', space_record.max_capacity - total_guests_count - guests_count_param,
    'max_capacity', space_record.max_capacity,
    'initial_status', initial_status,
    'approval_deadline', calculated_approval_deadline,
    'payment_deadline', calculated_payment_deadline
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Errore imprevisto: ' || SQLERRM
    );
END;
$$;