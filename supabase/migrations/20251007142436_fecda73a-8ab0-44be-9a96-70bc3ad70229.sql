-- Create new RPC function with unique name to avoid ambiguity
CREATE OR REPLACE FUNCTION public.get_space_availability_v2(
  space_id_param uuid,
  start_date_param text,
  end_date_param text
)
RETURNS TABLE(
  booking_id uuid,
  start_time text,
  end_time text,
  status text,
  user_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;