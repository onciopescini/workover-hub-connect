-- =====================================================
-- FIX: Exclude PostGIS System Tables from RLS Monitoring
-- Date: 2025-01-31
-- =====================================================

-- Drop old view
DROP VIEW IF EXISTS public.rls_status_check CASCADE;

-- Recreate with PostGIS tables excluded
CREATE VIEW public.rls_status_check AS
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ DISABLED'
  END as rls_status,
  (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE pg_policies.schemaname = t.schemaname
    AND pg_policies.tablename = t.tablename
  ) as policy_count
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
  -- Exclude PostGIS system tables
  AND t.tablename NOT IN (
    'spatial_ref_sys',
    'geography_columns', 
    'geometry_columns',
    'raster_columns',
    'raster_overviews'
  )
ORDER BY rowsecurity ASC, tablename;

GRANT SELECT ON public.rls_status_check TO authenticated;

COMMENT ON VIEW public.rls_status_check IS 
'Admin monitoring view for RLS status (excludes PostGIS system tables)';