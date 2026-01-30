-- ================================================================
-- FIX BROKEN ADMIN RPC FUNCTIONS
-- ================================================================
-- Issue 1: admin_get_bookings - Type mismatch with COALESCE
-- Issue 2: get_admin_kyc_hosts - p.email doesn't exist in profiles
-- ================================================================

-- Drop existing functions to allow return type changes
DROP FUNCTION IF EXISTS public.admin_get_bookings();

-- ================================================================
-- FIX 1: admin_get_bookings
-- Problem: Function tried to combine booking_date (date) with start_time (timestamptz)
-- using COALESCE with time literals, but start_time is already a timestamptz
-- ================================================================

CREATE OR REPLACE FUNCTION public.admin_get_bookings()
RETURNS TABLE (
  booking_id UUID,
  created_at TIMESTAMPTZ,
  check_in_date TIMESTAMPTZ,
  check_out_date TIMESTAMPTZ,
  status TEXT,
  total_price NUMERIC,
  coworker_email TEXT,
  coworker_name TEXT,
  workspace_name TEXT,
  host_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin Check using the is_admin() function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    b.id AS booking_id,
    b.created_at,
    -- Since start_time is already timestamptz, use it directly
    -- Fallback to booking_date at midnight if start_time is NULL
    COALESCE(b.start_time, b.booking_date::timestamptz) AS check_in_date,
    -- Same for end_time, default to end of booking_date if NULL
    COALESCE(b.end_time, (b.booking_date + INTERVAL '1 day' - INTERVAL '1 second')::timestamptz) AS check_out_date,
    b.status::text,
    -- Total Price from payments
    COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.booking_id = b.id AND p.payment_status IN ('completed', 'succeeded')
    ), 0)::numeric AS total_price,
    -- Coworker email from auth.users (not profiles)
    u_coworker.email::text AS coworker_email,
    TRIM(COALESCE(p_coworker.first_name, '') || ' ' || COALESCE(p_coworker.last_name, '')) AS coworker_name,
    s.title AS workspace_name,
    -- Host email from auth.users
    u_host.email::text AS host_email
  FROM
    public.bookings b
    LEFT JOIN public.spaces s ON b.space_id = s.id
    LEFT JOIN public.profiles p_coworker ON b.user_id = p_coworker.id
    LEFT JOIN auth.users u_coworker ON b.user_id = u_coworker.id
    LEFT JOIN auth.users u_host ON s.host_id = u_host.id
  WHERE b.deleted_at IS NULL
  ORDER BY b.created_at DESC;
END;
$$;

-- ================================================================
-- FIX 2: get_admin_kyc_hosts
-- Problem: Selecting p.email from profiles, but email is in auth.users
-- Solution: JOIN auth.users and select email from there
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_admin_kyc_hosts(
  kyc_status_param TEXT DEFAULT NULL
)
RETURNS TABLE(
  host_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  kyc_verified BOOLEAN,
  kyc_rejection_reason TEXT,
  stripe_connected BOOLEAN,
  created_at TIMESTAMPTZ,
  kyc_documents_count BIGINT,
  tax_details_count BIGINT,
  active_spaces_count BIGINT,
  total_bookings_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin check
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access Denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS host_id,
    p.first_name,
    p.last_name,
    -- Email comes from auth.users, NOT profiles
    u.email::text,
    p.kyc_verified,
    p.kyc_rejection_reason,
    p.stripe_connected,
    p.created_at,
    -- Count KYC documents
    (SELECT COUNT(*) FROM public.kyc_documents kd WHERE kd.user_id = p.id) AS kyc_documents_count,
    -- Count tax details
    (SELECT COUNT(*) FROM public.tax_details td WHERE td.profile_id = p.id AND td.valid_to IS NULL) AS tax_details_count,
    -- Count active spaces
    (SELECT COUNT(*) FROM public.spaces sp WHERE sp.host_id = p.id AND sp.is_suspended = FALSE) AS active_spaces_count,
    -- Count total bookings
    (SELECT COUNT(*) FROM public.bookings bk 
     INNER JOIN public.spaces sp ON sp.id = bk.space_id 
     WHERE sp.host_id = p.id) AS total_bookings_count
  FROM public.profiles p
  -- JOIN auth.users to get email
  INNER JOIN auth.users u ON p.id = u.id
  WHERE p.role = 'host'
    AND (
      kyc_status_param IS NULL OR
      (kyc_status_param = 'pending' AND p.kyc_verified IS NULL) OR
      (kyc_status_param = 'approved' AND p.kyc_verified = TRUE) OR
      (kyc_status_param = 'rejected' AND p.kyc_verified = FALSE)
    )
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_get_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_kyc_hosts(TEXT) TO authenticated;