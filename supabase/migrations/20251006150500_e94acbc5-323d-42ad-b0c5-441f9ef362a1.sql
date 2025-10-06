-- Fix refresh_user_suggestions to work for both coworkers and hosts
DROP FUNCTION IF EXISTS public.refresh_user_suggestions(uuid);

CREATE OR REPLACE FUNCTION public.refresh_user_suggestions(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  suggestions_count integer := 0;
BEGIN
  -- Delete existing suggestions for this user
  DELETE FROM public.connection_suggestions WHERE user_id = p_user_id;
  
  -- Insert new suggestions combining both coworker and host scenarios
  WITH 
  -- Scenario 1: User is COWORKER - find others who shared spaces
  coworker_suggestions AS (
    SELECT DISTINCT
      p_user_id as user_id,
      b2.user_id as suggested_user_id,
      'shared_space' as reason,
      jsonb_build_object(
        'space_id', s.id,
        'space_title', s.title,
        'booking_date', b1.booking_date
      ) as shared_context,
      10 as score
    FROM bookings b1
    JOIN spaces s ON s.id = b1.space_id
    JOIN bookings b2 ON b2.space_id = b1.space_id 
      AND b2.booking_date = b1.booking_date
      AND b2.user_id != b1.user_id
      AND (
        (b2.start_time <= b1.end_time AND b2.end_time >= b1.start_time)
      )
    WHERE b1.user_id = p_user_id
      AND b1.status = 'confirmed'
      AND b2.status = 'confirmed'
      AND b2.user_id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM connections c
        WHERE (c.sender_id = p_user_id AND c.receiver_id = b2.user_id)
           OR (c.sender_id = b2.user_id AND c.receiver_id = p_user_id)
      )
    
    UNION
    
    -- Also suggest the host of spaces the coworker booked
    SELECT DISTINCT
      p_user_id as user_id,
      s.host_id as suggested_user_id,
      'shared_space' as reason,
      jsonb_build_object(
        'space_id', s.id,
        'space_title', s.title,
        'booking_date', b1.booking_date
      ) as shared_context,
      8 as score
    FROM bookings b1
    JOIN spaces s ON s.id = b1.space_id
    WHERE b1.user_id = p_user_id
      AND b1.status = 'confirmed'
      AND s.host_id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM connections c
        WHERE (c.sender_id = p_user_id AND c.receiver_id = s.host_id)
           OR (c.sender_id = s.host_id AND c.receiver_id = p_user_id)
      )
  ),
  
  -- Scenario 2: User is HOST - find coworkers who booked their spaces
  host_suggestions AS (
    SELECT DISTINCT
      p_user_id as user_id,
      b1.user_id as suggested_user_id,
      'shared_space' as reason,
      jsonb_build_object(
        'space_id', s.id,
        'space_title', s.title,
        'booking_date', b1.booking_date
      ) as shared_context,
      10 as score
    FROM spaces s
    JOIN bookings b1 ON b1.space_id = s.id
    JOIN bookings b2 ON b2.space_id = s.id 
      AND b2.booking_date = b1.booking_date
      AND b2.id != b1.id
      AND (
        (b1.start_time <= b2.end_time AND b1.end_time >= b2.start_time)
      )
    WHERE s.host_id = p_user_id
      AND b1.status = 'confirmed'
      AND b2.status = 'confirmed'
      AND b1.user_id != p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM connections c
        WHERE (c.sender_id = p_user_id AND c.receiver_id = b1.user_id)
           OR (c.sender_id = b1.user_id AND c.receiver_id = p_user_id)
      )
  ),
  
  -- Combine both scenarios
  all_suggestions AS (
    SELECT * FROM coworker_suggestions
    UNION
    SELECT * FROM host_suggestions
  )
  
  INSERT INTO public.connection_suggestions (
    user_id,
    suggested_user_id,
    reason,
    shared_context,
    score
  )
  SELECT 
    user_id,
    suggested_user_id,
    reason,
    shared_context,
    score
  FROM all_suggestions;
  
  GET DIAGNOSTICS suggestions_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', true,
    'count', suggestions_count
  );
END;
$$;