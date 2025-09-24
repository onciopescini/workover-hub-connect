-- Fix the validate_and_reserve_slot function to clean up expired slots for all users
CREATE OR REPLACE FUNCTION public.validate_and_reserve_slot(
  space_id_param uuid,
  date_param date,
  start_time_param time,
  end_time_param time,
  user_id_param uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  slot_conflict RECORD;
  space_record RECORD;
  new_booking_id UUID;
  confirmation_type TEXT;
BEGIN
  -- Always cleanup expired slots first (removed admin check)
  PERFORM public.cleanup_expired_slots();
  
  -- Verifica che lo spazio esista e sia pubblicato
  SELECT * INTO space_record FROM public.spaces 
  WHERE id = space_id_param AND published = TRUE AND NOT is_suspended;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Space not found or not available'
    );
  END IF;
  
  -- Controlla conflitti esistenti (solo prenotazioni confermate o pendenti non scadute)
  SELECT * INTO slot_conflict
  FROM public.bookings 
  WHERE space_id = space_id_param 
    AND booking_date = date_param
    AND status IN ('confirmed', 'pending')
    AND (
      (start_time_param >= start_time AND start_time_param < end_time) OR
      (end_time_param > start_time AND end_time_param <= end_time) OR
      (start_time_param <= start_time AND end_time_param >= end_time)
    )
    AND (slot_reserved_until IS NULL OR slot_reserved_until > NOW());
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Time slot is not available'
    );
  END IF;
  
  -- Crea la prenotazione con slot riservato
  INSERT INTO public.bookings (
    space_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    status,
    slot_reserved_until,
    payment_required,
    reservation_token
  ) VALUES (
    space_id_param,
    user_id_param,
    date_param,
    start_time_param,
    end_time_param,
    'pending',
    NOW() + INTERVAL '15 minutes',
    TRUE,
    gen_random_uuid()
  ) RETURNING id INTO new_booking_id;
  
  -- Ottieni il tipo di conferma
  SELECT COALESCE(confirmation_type, 'instant') INTO confirmation_type
  FROM public.spaces WHERE id = space_id_param;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'reservation_token', (SELECT reservation_token FROM public.bookings WHERE id = new_booking_id),
    'reserved_until', NOW() + INTERVAL '15 minutes',
    'space_title', space_record.title,
    'confirmation_type', confirmation_type
  );
END;
$function$;

-- Clean up any existing expired bookings immediately
DELETE FROM public.bookings 
WHERE slot_reserved_until < NOW() 
AND status = 'pending' 
AND payment_required = true
AND NOT EXISTS (
  SELECT 1 
  FROM public.payments 
  WHERE payments.booking_id = bookings.id 
  AND payment_status = 'completed'
);