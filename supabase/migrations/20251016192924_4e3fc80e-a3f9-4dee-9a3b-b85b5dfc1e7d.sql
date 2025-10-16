-- Create RPC function to check slot conflicts before host approval
CREATE OR REPLACE FUNCTION public.check_slot_conflicts(
  space_id_param UUID,
  date_param DATE,
  start_time_param TIME,
  end_time_param TIME,
  exclude_booking_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conflict_count INTEGER;
  space_capacity INTEGER;
  total_guests INTEGER;
BEGIN
  -- Get space max capacity
  SELECT max_capacity INTO space_capacity
  FROM public.spaces
  WHERE id = space_id_param;
  
  -- Check for overlapping bookings in confirmed/pending status
  SELECT COUNT(*), COALESCE(SUM(guests_count), 0)
  INTO conflict_count, total_guests
  FROM public.bookings
  WHERE space_id = space_id_param
    AND booking_date = date_param
    AND status IN ('pending', 'confirmed', 'pending_payment', 'pending_approval')
    AND (exclude_booking_id IS NULL OR id != exclude_booking_id)
    AND (
      -- Start time falls within existing booking
      (start_time_param >= start_time AND start_time_param < end_time)
      OR
      -- End time falls within existing booking
      (end_time_param > start_time AND end_time_param <= end_time)
      OR
      -- New booking completely contains existing booking
      (start_time_param <= start_time AND end_time_param >= end_time)
    );
  
  RETURN json_build_object(
    'has_conflict', conflict_count > 0,
    'conflict_count', conflict_count,
    'total_guests', total_guests,
    'space_capacity', space_capacity,
    'capacity_available', space_capacity - total_guests
  );
END;
$$;