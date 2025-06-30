
-- Fix the validate_and_reserve_slot function with better error handling and parameter validation
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
SET search_path TO 'public'
AS $function$
DECLARE
  conflict_count INTEGER := 0;
  reservation_time TIMESTAMPTZ := NOW() + INTERVAL '5 minutes';
  new_booking_id UUID;
  space_host_id UUID;
  space_title TEXT;
  space_confirmation_type TEXT;
  result JSON;
BEGIN
  -- Validate input parameters
  IF space_id_param IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Space ID is required'
    );
  END IF;
  
  IF date_param IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Date is required'
    );
  END IF;
  
  IF start_time_param IS NULL OR end_time_param IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Start time and end time are required'
    );
  END IF;
  
  IF user_id_param IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID is required'
    );
  END IF;

  -- Lock per prevenire race conditions
  LOCK TABLE bookings IN SHARE ROW EXCLUSIVE MODE;
  
  -- Pulisci slot scaduti prima della validazione
  PERFORM cleanup_expired_slots();
  
  -- Verifica che lo spazio sia disponibile e ottieni il confirmation_type dal database
  SELECT s.host_id, s.title, s.confirmation_type INTO space_host_id, space_title, space_confirmation_type
  FROM spaces s
  JOIN profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param 
  AND s.published = true 
  AND s.is_suspended = false
  AND p.stripe_connected = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Space not available or host not connected to Stripe'
    );
  END IF;
  
  -- Controlla conflitti esistenti (inclusi slot riservati)
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE space_id = space_id_param
    AND booking_date = date_param
    AND status IN ('pending', 'confirmed')
    AND (
      (start_time < end_time_param AND end_time > start_time_param) OR
      (slot_reserved_until > NOW() AND start_time < end_time_param AND end_time > start_time_param)
    );
  
  IF conflict_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Time slot is not available'
    );
  END IF;
  
  -- Crea prenotazione con slot riservato
  INSERT INTO bookings (
    space_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    status,
    slot_reserved_until,
    payment_required
  ) VALUES (
    space_id_param,
    user_id_param,
    date_param,
    start_time_param,
    end_time_param,
    'pending',
    reservation_time,
    true
  ) RETURNING id INTO new_booking_id;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'reservation_token', (SELECT reservation_token FROM bookings WHERE id = new_booking_id),
    'reserved_until', reservation_time,
    'space_title', space_title,
    'confirmation_type', space_confirmation_type
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error: ' || SQLERRM
    );
END;
$function$;
