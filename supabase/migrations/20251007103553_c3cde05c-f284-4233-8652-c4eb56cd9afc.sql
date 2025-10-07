-- Create RPC function to batch fetch space availability for multiple spaces
-- This improves performance by reducing the number of database queries

CREATE OR REPLACE FUNCTION get_spaces_availability_batch(
  space_ids uuid[],
  check_date date,
  check_start_time time,
  check_end_time time
)
RETURNS TABLE (
  space_id uuid,
  max_capacity integer,
  booked_capacity integer,
  available_capacity integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as space_id,
    s.max_capacity,
    COALESCE(SUM(b.guests_count), 0)::integer as booked_capacity,
    (s.max_capacity - COALESCE(SUM(b.guests_count), 0))::integer as available_capacity
  FROM spaces s
  LEFT JOIN bookings b ON b.space_id = s.id
    AND b.booking_date = check_date
    AND b.status IN ('pending', 'confirmed')
    AND b.start_time IS NOT NULL
    AND b.end_time IS NOT NULL
    AND (
      -- Check for time overlap
      (b.start_time < check_end_time AND b.end_time > check_start_time)
    )
  WHERE s.id = ANY(space_ids)
    AND s.published = true
    AND s.deleted_at IS NULL
  GROUP BY s.id, s.max_capacity;
END;
$$;