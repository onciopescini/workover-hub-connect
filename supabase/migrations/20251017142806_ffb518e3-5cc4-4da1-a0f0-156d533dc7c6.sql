-- Fix booking status enum cast in validate_and_reserve_slot
-- Issue: PostgreSQL cannot automatically cast text to enum type booking_status

CREATE OR REPLACE FUNCTION public.validate_and_reserve_slot(
  space_id_param UUID,
  date_param DATE,
  start_time_param TIME,
  end_time_param TIME,
  user_id_param UUID,
  guests_count_param INTEGER,
  confirmation_type_param TEXT,
  client_base_price_param NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_booking_id UUID;
  v_reservation_token UUID;
  v_server_price NUMERIC;
  v_duration_hours NUMERIC;
  v_payment_required BOOLEAN;
  v_reservation_deadline TIMESTAMPTZ;
  v_approval_deadline TIMESTAMPTZ;
  v_conflict_check JSONB;
BEGIN
  -- Get space details with host Stripe validation
  SELECT 
    s.*,
    p.stripe_account_id,
    p.stripe_connected
  INTO v_space
  FROM public.spaces s
  LEFT JOIN public.profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param
    AND s.published = true
    AND s.is_suspended = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Space not found or not available'
    );
  END IF;

  -- Validate host Stripe connection
  IF NOT COALESCE(v_space.stripe_connected, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Host Stripe account not connected'
    );
  END IF;

  -- Check for conflicts using existing RPC
  SELECT public.check_slot_conflicts(
    space_id_param,
    date_param,
    start_time_param,
    end_time_param,
    NULL
  ) INTO v_conflict_check;

  IF (v_conflict_check->>'has_conflict')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Slot conflict detected'
    );
  END IF;

  -- Validate capacity
  IF ((v_conflict_check->>'total_guests')::INTEGER + guests_count_param) > (v_conflict_check->>'space_capacity')::INTEGER THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Capacity exceeded'
    );
  END IF;

  -- Calculate server-side price (FIXED: correct order end_time - start_time)
  v_duration_hours := EXTRACT(EPOCH FROM (end_time_param - start_time_param)) / 3600.0;
  v_duration_hours := ABS(v_duration_hours);

  IF v_duration_hours >= 6 THEN
    v_server_price := v_space.price_per_day;
  ELSE
    v_server_price := v_space.price_per_hour * v_duration_hours;
  END IF;

  -- Validate client price against server calculation
  IF client_base_price_param IS NOT NULL THEN
    IF ABS(v_server_price - client_base_price_param) > 1.00 THEN
      RAISE EXCEPTION 'Price mismatch: server=% client=%. Possible tampering detected.', 
        v_server_price, client_base_price_param;
    END IF;
  END IF;

  -- Generate reservation token
  v_reservation_token := gen_random_uuid();
  v_payment_required := (confirmation_type_param = 'instant');

  -- Calculate deadlines
  IF v_payment_required THEN
    v_reservation_deadline := NOW() + INTERVAL '2 hours';
  ELSE
    v_reservation_deadline := NOW() + INTERVAL '24 hours';
    v_approval_deadline := NOW() + INTERVAL '24 hours';
  END IF;

  -- FIXED: Cast status to booking_status enum type
  INSERT INTO public.bookings (
    space_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    guests_count,
    status,
    payment_required,
    slot_reserved_until,
    reservation_token,
    approval_deadline
  ) VALUES (
    space_id_param,
    user_id_param,
    date_param,
    start_time_param,
    end_time_param,
    guests_count_param,
    CASE 
      WHEN confirmation_type_param = 'instant' THEN 'pending_payment'::booking_status
      ELSE 'pending_approval'::booking_status
    END,
    v_payment_required,
    v_reservation_deadline,
    v_reservation_token,
    v_approval_deadline
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'reservation_token', v_reservation_token,
    'reserved_until', v_reservation_deadline,
    'space_title', v_space.title,
    'confirmation_type', confirmation_type_param,
    'server_base_price', v_server_price
  );
END;
$$;