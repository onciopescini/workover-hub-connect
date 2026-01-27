-- =====================================================
-- SELF-BOOKING PREVENTION
-- Add check to prevent hosts from booking their own spaces
-- =====================================================

-- First, let's create an RPC function that validates self-booking
-- This will be called from the existing validate_and_reserve_slot
CREATE OR REPLACE FUNCTION public.check_self_booking(
  p_space_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spaces 
    WHERE id = p_space_id AND host_id = p_user_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_self_booking(uuid, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.check_self_booking IS 
  'Returns true if the user is the host of the space (self-booking attempt)';