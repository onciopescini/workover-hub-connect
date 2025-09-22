CREATE OR REPLACE FUNCTION public.validate_and_reserve_slot(
  space_id_param uuid, 
  date_param date, 
  start_time_param time without time zone, 
  end_time_param time without time zone, 
  user_id_param uuid, 
  confirmation_type_param text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_admin uuid := auth.uid();
  conflict_count INTEGER := 0;
  reservation_time TIMESTAMPTZ := NOW() + INTERVAL '5 minutes';
  new_booking_id UUID;
  space_host_id UUID;
  space_title TEXT;
  space_confirmation_type TEXT;
BEGIN
  -- Validazioni input
  IF space_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Space ID is required');
  END IF;
  IF date_param IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Date is required');
  END IF;
  IF start_time_param IS NULL OR end_time_param IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Start time and end time are required');
  END IF;
  IF user_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User ID is required');
  END IF;

  -- Lock per prevenire race
  LOCK TABLE public.bookings IN SHARE ROW EXCLUSIVE MODE;

  -- Cleanup SOLO in contesto admin (evita log con admin_id NULL)
  IF v_admin IS NOT NULL THEN
    PERFORM public.cleanup_expired_slots();
  END IF;

  -- Verifica spazio (solo su tabella spaces — nessun JOIN profiles/blocchi Stripe qui)
  SELECT s.host_id, s.title, s.confirmation_type
    INTO space_host_id, space_title, space_confirmation_type
  FROM public.spaces s
  WHERE s.id = space_id_param
    AND COALESCE(s.published, true) = true
    AND COALESCE(s.is_suspended, false) = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Space not available');
  END IF;

  -- Conflitti (considera anche slot riservati non scaduti)
  SELECT COUNT(*) INTO conflict_count
  FROM public.bookings
  WHERE space_id = space_id_param
    AND booking_date = date_param
    AND status IN ('pending','confirmed')
    AND (
      (start_time < end_time_param AND end_time > start_time_param)
      OR (slot_reserved_until > NOW() AND start_time < end_time_param AND end_time > start_time_param)
    );

  IF conflict_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'Time slot is not available');
  END IF;

  -- Crea prenotazione pending con slot riservato
  INSERT INTO public.bookings (
    space_id, user_id, booking_date, start_time, end_time,
    status, slot_reserved_until, payment_required
  ) VALUES (
    space_id_param, user_id_param, date_param, start_time_param, end_time_param,
    'pending', reservation_time, true
  )
  RETURNING id INTO new_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'reservation_token', (SELECT reservation_token FROM public.bookings WHERE id = new_booking_id),
    'reserved_until', reservation_time,
    'space_title', space_title,
    'confirmation_type', space_confirmation_type
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Database error: ' || SQLERRM);
END;
$$;