-- Fix B.2: N+1 Query Admin KYC - Optimized RPC Function
-- Creates a batch loading function for KYC data with host profiles
CREATE OR REPLACE FUNCTION get_admin_kyc_hosts(
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS host_id,
    p.first_name,
    p.last_name,
    p.email,
    p.kyc_verified,
    p.kyc_rejection_reason,
    p.stripe_connected,
    p.created_at,
    -- Count KYC documents
    (SELECT COUNT(*) FROM kyc_documents kd WHERE kd.user_id = p.id) AS kyc_documents_count,
    -- Count tax details
    (SELECT COUNT(*) FROM tax_details td WHERE td.profile_id = p.id AND td.valid_to IS NULL) AS tax_details_count,
    -- Count active spaces
    (SELECT COUNT(*) FROM spaces s WHERE s.host_id = p.id AND s.is_suspended = FALSE) AS active_spaces_count,
    -- Count total bookings
    (SELECT COUNT(*) FROM bookings b 
     INNER JOIN spaces s ON s.id = b.space_id 
     WHERE s.host_id = p.id) AS total_bookings_count
  FROM profiles p
  WHERE p.role = 'host'
    AND (
      kyc_status_param IS NULL OR
      (kyc_status_param = 'pending' AND p.kyc_verified IS NULL) OR
      (kyc_status_param = 'approved' AND p.kyc_verified = TRUE) OR
      (kyc_status_param = 'rejected' AND p.kyc_verified = FALSE)
    )
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;