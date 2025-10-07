-- Fix get_space_availability_optimized RPC to properly cast status and format times
DROP FUNCTION IF EXISTS public.get_space_availability_optimized(uuid, text, text);

CREATE OR REPLACE FUNCTION public.get_space_availability_optimized(
  space_id_param uuid,
  start_date_param text,
  end_date_param text
)
RETURNS TABLE (
  booking_id uuid,
  start_time text,
  end_time text,
  status text,
  user_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS booking_id,
    TO_CHAR(b.start_time, 'HH24:MI') AS start_time,
    TO_CHAR(b.end_time, 'HH24:MI') AS end_time,
    b.status::text AS status,
    b.user_id
  FROM public.bookings b
  WHERE b.space_id = space_id_param
    AND b.booking_date >= start_date_param::date
    AND b.booking_date <= end_date_param::date
    AND b.status IN ('pending', 'confirmed')
  ORDER BY b.booking_date, b.start_time;
END;
$$;

-- Fix validate_booking_slot_with_lock RPC to properly cast status
DROP FUNCTION IF EXISTS public.validate_booking_slot_with_lock(uuid, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.validate_booking_slot_with_lock(
  space_id_param uuid,
  date_param text,
  start_time_param text,
  end_time_param text,
  user_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflicts_json json;
BEGIN
  -- Lock table to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(space_id_param::text || date_param || start_time_param));
  
  -- Check for conflicting bookings
  SELECT COALESCE(json_agg(conflict_data), '[]'::json) INTO conflicts_json
  FROM (
    SELECT 
      b.id,
      TO_CHAR(b.start_time, 'HH24:MI') AS start_time,
      TO_CHAR(b.end_time, 'HH24:MI') AS end_time,
      b.status::text AS status,
      b.user_id
    FROM public.bookings b
    WHERE b.space_id = space_id_param
      AND b.booking_date = date_param::date
      AND b.status IN ('pending', 'confirmed')
      AND (
        (b.start_time <= start_time_param::time AND b.end_time > start_time_param::time)
        OR (b.start_time < end_time_param::time AND b.end_time >= end_time_param::time)
        OR (b.start_time >= start_time_param::time AND b.end_time <= end_time_param::time)
      )
  ) conflict_data;
  
  IF conflicts_json::text != '[]' THEN
    RETURN json_build_object(
      'valid', false,
      'conflicts', conflicts_json,
      'message', 'Slot già prenotato o in conflitto con altre prenotazioni'
    );
  ELSE
    RETURN json_build_object(
      'valid', true,
      'conflicts', '[]'::json,
      'message', 'Slot disponibile'
    );
  END IF;
END;
$$;

-- Fix get_alternative_time_slots RPC
DROP FUNCTION IF EXISTS public.get_alternative_time_slots(uuid, text, numeric);

CREATE OR REPLACE FUNCTION public.get_alternative_time_slots(
  space_id_param uuid,
  date_param text,
  duration_hours_param numeric
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  suggested_slots text[] := '{}';
  slot_time time := '08:00';
  end_of_day time := '20:00';
  slot_duration interval;
  is_available boolean;
BEGIN
  slot_duration := (duration_hours_param || ' hours')::interval;
  
  WHILE slot_time < end_of_day LOOP
    -- Check if this slot is available
    SELECT NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.space_id = space_id_param
        AND b.booking_date = date_param::date
        AND b.status IN ('pending', 'confirmed')
        AND (
          (b.start_time <= slot_time AND b.end_time > slot_time)
          OR (b.start_time < (slot_time + slot_duration) AND b.end_time >= (slot_time + slot_duration))
          OR (b.start_time >= slot_time AND b.end_time <= (slot_time + slot_duration))
        )
    ) INTO is_available;
    
    IF is_available THEN
      suggested_slots := array_append(suggested_slots, TO_CHAR(slot_time, 'HH24:MI'));
    END IF;
    
    -- Move to next 30-minute slot
    slot_time := slot_time + interval '30 minutes';
  END LOOP;
  
  RETURN suggested_slots;
END;
$$;