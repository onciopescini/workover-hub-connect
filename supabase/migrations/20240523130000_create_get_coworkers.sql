-- Migration to add get_coworkers RPC function if it doesn't exist
-- This ensures the "Who's Here" feature works by querying bookings

CREATE OR REPLACE FUNCTION get_coworkers(booking_id uuid DEFAULT NULL, current_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  job_title text,
  city text,
  nickname text,
  role public.app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_space_id uuid;
  target_date date;
BEGIN
  -- If booking_id is provided, use it to determine space and date
  IF booking_id IS NOT NULL THEN
    SELECT space_id, booking_date INTO target_space_id, target_date
    FROM bookings
    WHERE bookings.id = booking_id;
  ELSE
    -- Fallback: try to find an active booking for the current user today
    SELECT space_id, booking_date INTO target_space_id, target_date
    FROM bookings
    WHERE user_id = current_user_id
      AND status = 'checked_in'
      AND booking_date = CURRENT_DATE
    LIMIT 1;
  END IF;

  -- If no valid context found, return empty
  IF target_space_id IS NULL THEN
    RETURN;
  END IF;

  -- Return users who are checked in at the same space on the same day
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.profile_photo_url as avatar_url,
    p.job_title,
    p.city,
    p.nickname,
    p.role
  FROM bookings b
  JOIN profiles p ON b.user_id = p.id
  WHERE b.space_id = target_space_id
    AND b.booking_date = target_date
    AND b.status = 'checked_in'
    AND (current_user_id IS NULL OR b.user_id != current_user_id); -- Exclude self if requested
END;
$$;
