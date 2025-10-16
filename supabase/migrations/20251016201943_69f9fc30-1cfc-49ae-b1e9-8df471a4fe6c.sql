-- Fase 11: Multi-Slot Booking Support
-- RPC function per validare e prenotare più slot in una singola transazione atomica

CREATE OR REPLACE FUNCTION public.validate_and_reserve_multi_slots(
  space_id_param UUID,
  slots_param JSONB, -- Array di {date, start_time, end_time}
  user_id_param UUID,
  guests_count_param INTEGER,
  confirmation_type_param TEXT,
  client_total_price_param NUMERIC DEFAULT NULL -- Prezzo totale calcolato dal client per validazione
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space RECORD;
  v_slot JSONB;
  v_booking_ids UUID[] := '{}';
  v_reservation_token UUID;
  v_server_total_price NUMERIC := 0;
  v_slot_price NUMERIC;
  v_duration_hours NUMERIC;
  v_conflict_check JSONB;
  v_payment_required BOOLEAN;
  v_reservation_deadline TIMESTAMPTZ;
  v_approval_deadline TIMESTAMPTZ;
  v_host_profile RECORD;
BEGIN
  -- Validazione: almeno un slot richiesto
  IF jsonb_array_length(slots_param) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'At least one slot is required'
    );
  END IF;

  -- Get space details con validazione host Stripe
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

  -- Validazione Stripe host
  IF NOT COALESCE(v_space.stripe_connected, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Host Stripe account not connected'
    );
  END IF;

  -- Generate shared reservation token for all slots
  v_reservation_token := gen_random_uuid();
  v_payment_required := (confirmation_type_param = 'instant');

  -- Calculate reservation deadline (2 hours for instant, 24 hours for approval)
  IF v_payment_required THEN
    v_reservation_deadline := NOW() + INTERVAL '2 hours';
  ELSE
    v_reservation_deadline := NOW() + INTERVAL '24 hours';
    v_approval_deadline := NOW() + INTERVAL '24 hours';
  END IF;

  -- Loop through each slot and validate + create booking
  FOR i IN 0..jsonb_array_length(slots_param) - 1 LOOP
    v_slot := slots_param -> i;

    -- Validate slot structure
    IF NOT (v_slot ? 'date' AND v_slot ? 'start_time' AND v_slot ? 'end_time') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid slot structure at index ' || i
      );
    END IF;

    -- Check for conflicts using existing RPC
    SELECT public.check_slot_conflicts(
      space_id_param,
      (v_slot->>'date')::DATE,
      (v_slot->>'start_time')::TIME,
      (v_slot->>'end_time')::TIME,
      NULL
    ) INTO v_conflict_check;

    IF (v_conflict_check->>'has_conflict')::BOOLEAN THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Slot conflict detected on ' || (v_slot->>'date') || ' at ' || (v_slot->>'start_time')
      );
    END IF;

    -- Validate capacity
    IF ((v_conflict_check->>'total_guests')::INTEGER + guests_count_param) > (v_conflict_check->>'space_capacity')::INTEGER THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Capacity exceeded on ' || (v_slot->>'date')
      );
    END IF;

    -- Calculate server-side price for this slot
    v_duration_hours := EXTRACT(EPOCH FROM (
      (v_slot->>'end_time')::TIME - (v_slot->>'start_time')::TIME
    )) / 3600.0;

    IF v_duration_hours >= 6 THEN
      v_slot_price := v_space.price_per_day;
    ELSE
      v_slot_price := v_space.price_per_hour * v_duration_hours;
    END IF;

    v_server_total_price := v_server_total_price + v_slot_price;

    -- Create booking for this slot
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
      (v_slot->>'date')::DATE,
      (v_slot->>'start_time')::TIME,
      (v_slot->>'end_time')::TIME,
      guests_count_param,
      CASE 
        WHEN confirmation_type_param = 'instant' THEN 'pending_payment'
        ELSE 'pending_approval'
      END,
      v_payment_required,
      v_reservation_deadline,
      v_reservation_token,
      v_approval_deadline
    )
    RETURNING id INTO v_booking_ids[array_length(v_booking_ids, 1) + 1];
  END LOOP;

  -- Validate total price against client calculation (tolerance: 1€)
  IF client_total_price_param IS NOT NULL THEN
    IF ABS(v_server_total_price - client_total_price_param) > 1.00 THEN
      -- Rollback transaction by raising exception
      RAISE EXCEPTION 'Price mismatch: server=% client=%. Possible tampering detected.', 
        v_server_total_price, client_total_price_param;
    END IF;
  END IF;

  -- Return success with all booking IDs
  RETURN jsonb_build_object(
    'success', true,
    'booking_ids', to_jsonb(v_booking_ids),
    'reservation_token', v_reservation_token,
    'reserved_until', v_reservation_deadline,
    'space_title', v_space.title,
    'confirmation_type', confirmation_type_param,
    'total_slots', jsonb_array_length(slots_param),
    'server_total_price', v_server_total_price
  );
END;
$$;