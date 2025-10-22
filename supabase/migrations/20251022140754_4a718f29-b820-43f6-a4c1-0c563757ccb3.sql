-- =====================================================
-- Fix Function Search Path Mutable
-- =====================================================
-- Issue: Function without search_path set is vulnerable to schema manipulation
-- Solution: Set search_path = public for all functions
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Fix: calculate_ticket_sla_deadlines
ALTER FUNCTION public.calculate_ticket_sla_deadlines()
SET search_path = public;

COMMENT ON FUNCTION public.calculate_ticket_sla_deadlines() IS 
  'Calculates SLA response and resolution deadlines based on ticket priority. search_path=public prevents schema manipulation attacks.';

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify all functions have search_path set:
-- SELECT 
--   p.proname as function_name,
--   p.proconfig as config,
--   CASE 
--     WHEN p.proconfig IS NOT NULL AND 'search_path' = ANY(
--       SELECT split_part(unnest(p.proconfig), '=', 1)
--     ) THEN '✅ SECURE'
--     ELSE '⚠️ NEEDS FIX'
--   END as status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.prokind = 'f'
-- ORDER BY p.proname;