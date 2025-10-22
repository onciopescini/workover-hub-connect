-- =====================================================
-- Fix SECURITY DEFINER Views - Alternative Approach
-- =====================================================
-- PostgreSQL views are SECURITY DEFINER by default in older versions
-- We need to explicitly set security_invoker option

-- Method 1: Alter existing views to set security_invoker
ALTER VIEW compliance_monitoring_metrics SET (security_invoker = on);
ALTER VIEW profiles_public_safe SET (security_invoker = on);
ALTER VIEW profiles_with_role SET (security_invoker = on);
ALTER VIEW spaces_public_safe SET (security_invoker = on);
ALTER VIEW spaces_public_view SET (security_invoker = on);

-- Add security_barrier for additional protection
ALTER VIEW compliance_monitoring_metrics SET (security_barrier = on);
ALTER VIEW profiles_with_role SET (security_barrier = on);

-- Add comments documenting security model
COMMENT ON VIEW compliance_monitoring_metrics IS 
  'Admin-only compliance metrics. SECURITY INVOKER ensures RLS policies from underlying tables are respected. Only admins with has_role(auth.uid(), ''admin'') can access.';

COMMENT ON VIEW profiles_public_safe IS 
  'Public view of profiles with networking enabled. SECURITY INVOKER ensures RLS policies from profiles table are respected.';

COMMENT ON VIEW profiles_with_role IS 
  'Complete profile data with role. SECURITY INVOKER ensures users can only see their own data via RLS policies on profiles table.';

COMMENT ON VIEW spaces_public_safe IS 
  'Public view of published spaces without sensitive data (no host_id, no GPS coordinates). SECURITY INVOKER respects spaces table RLS.';

COMMENT ON VIEW spaces_public_view IS 
  'Minimal public space data for listings. SECURITY INVOKER respects spaces table RLS policies.';

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the fix:
-- SELECT 
--   c.relname as view_name,
--   COALESCE(
--     (SELECT option_value::boolean 
--      FROM pg_options_to_table(c.reloptions) 
--      WHERE option_name = 'security_invoker'),
--     false
--   ) as is_security_invoker
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE c.relkind = 'v'
--   AND n.nspname = 'public'
--   AND c.relname IN ('compliance_monitoring_metrics', 'profiles_public_safe', 
--                     'profiles_with_role', 'spaces_public_safe', 'spaces_public_view')
-- ORDER BY c.relname;