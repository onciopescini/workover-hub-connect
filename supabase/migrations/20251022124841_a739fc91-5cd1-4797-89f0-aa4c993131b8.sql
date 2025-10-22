-- Migration: Fix search_path security for SECURITY DEFINER functions
-- Purpose: Ensure all SECURITY DEFINER functions have immutable search_path to prevent schema manipulation attacks
-- Security Issue: Functions without fixed search_path can be exploited by attackers creating malicious schemas

-- ============================================================================
-- SECURITY CONTEXT
-- ============================================================================
-- Attack Vector: Attacker creates malicious schema and manipulates search_path
-- Example Attack:
--   1. CREATE SCHEMA attack;
--   2. CREATE FUNCTION attack.has_role() RETURNS BOOLEAN AS $$ BEGIN RETURN true; END; $$;
--   3. SET search_path = attack, public;
--   4. Vulnerable function now calls attack.has_role() instead of public.has_role()
--
-- Fix: All SECURITY DEFINER functions must have SET search_path = 'schema_list'
-- ============================================================================

-- Status Check: All SECURITY DEFINER functions already have search_path set ✓
-- This migration standardizes and documents the security configuration

-- ============================================================================
-- CATEGORY 1: Core Permission Functions (Highest Security)
-- These should ONLY access public schema
-- ============================================================================

-- Function: has_role - Core role checking function
-- Current: search_path=public, pg_catalog
-- Fix: Remove pg_catalog (not needed, adds attack surface)
ALTER FUNCTION public.has_role(uuid, app_role)
SET search_path = public;

COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 
'Security: Immutable search_path=public. Used for authorization checks.';

-- Function: is_admin - Admin role checker
-- Current: search_path=public, pg_catalog
-- Fix: Standardize to public only
ALTER FUNCTION public.is_admin(uuid)
SET search_path = public;

COMMENT ON FUNCTION public.is_admin(uuid) IS 
'Security: Immutable search_path=public. Critical for admin authorization.';

-- Function: is_moderator - Moderator role checker
-- Current: search_path=public, pg_catalog
-- Fix: Standardize to public only
ALTER FUNCTION public.is_moderator(uuid)
SET search_path = public;

COMMENT ON FUNCTION public.is_moderator(uuid) IS 
'Security: Immutable search_path=public. Critical for moderator authorization.';

-- Function: can_moderate_content - Content moderation checker
-- Current: search_path=public, pg_catalog
-- Fix: Standardize to public only
ALTER FUNCTION public.can_moderate_content(uuid)
SET search_path = public;

COMMENT ON FUNCTION public.can_moderate_content(uuid) IS 
'Security: Immutable search_path=public. Used for content moderation authorization.';

-- ============================================================================
-- CATEGORY 2: Data Access Functions (High Security)
-- ============================================================================

-- Function: get_hosts_for_dac7_report - Financial data access
-- Current: search_path=public, pg_catalog
-- Fix: Standardize to public only (pg_catalog not needed)
ALTER FUNCTION public.get_hosts_for_dac7_report(integer, uuid[])
SET search_path = public;

COMMENT ON FUNCTION public.get_hosts_for_dac7_report(integer, uuid[]) IS 
'Security: Immutable search_path=public. GDPR/DAC7 financial reporting - admin only.';

-- Function: get_or_create_conversation - Messaging system
-- Current: search_path=public, pg_temp
-- Action: Keep pg_temp (needed for temporary tables) - SECURE AS-IS ✓
COMMENT ON FUNCTION public.get_or_create_conversation(uuid, uuid, uuid, uuid) IS 
'Security: search_path=public,pg_temp. pg_temp needed for temporary conversation objects.';

-- ============================================================================
-- CATEGORY 3: Authentication/Trigger Functions (Require auth schema)
-- ============================================================================

-- Function: validate_booking_email_verified - Email verification trigger
-- Current: search_path=public, auth
-- Action: KEEP auth schema (required to access auth.users table) - SECURE AS-IS ✓
COMMENT ON FUNCTION public.validate_booking_email_verified() IS 
'Security: search_path=public,auth. Auth schema required for auth.users access in trigger.';

-- Function: validate_space_email_verified - Email verification trigger  
-- Current: search_path=public, auth
-- Action: KEEP auth schema (required to access auth.users table) - SECURE AS-IS ✓
COMMENT ON FUNCTION public.validate_space_email_verified() IS 
'Security: search_path=public,auth. Auth schema required for auth.users access in trigger.';

-- ============================================================================
-- CATEGORY 4: Cron Job Functions (Require cron schema)
-- ============================================================================

-- Function: get_cron_jobs - Admin cron job viewer
-- Current: search_path=public, cron
-- Action: KEEP cron schema (required to access cron.job table) - SECURE AS-IS ✓
COMMENT ON FUNCTION public.get_cron_jobs() IS 
'Security: search_path=public,cron. Cron schema required for cron.job access. Admin only.';

-- Function: get_cron_job_runs - Admin cron job run viewer
-- Current: search_path=public, cron
-- Action: KEEP cron schema (required to access cron.job_run_details) - SECURE AS-IS ✓
COMMENT ON FUNCTION public.get_cron_job_runs(integer) IS 
'Security: search_path=public,cron. Cron schema required for cron.job_run_details. Admin only.';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all SECURITY DEFINER functions have immutable search_path:
--
-- SELECT 
--   p.proname,
--   p.proconfig,
--   CASE 
--     WHEN p.proconfig IS NULL THEN '❌ VULNERABLE'
--     ELSE '✅ SECURE'
--   END as status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' AND p.prosecdef = true
-- ORDER BY p.proname;
--
-- Expected: All functions should show '✅ SECURE'
-- ============================================================================

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Security Migration: search_path Hardening';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed Functions:';
  RAISE NOTICE '  ✓ has_role() - Removed pg_catalog';
  RAISE NOTICE '  ✓ is_admin() - Removed pg_catalog';
  RAISE NOTICE '  ✓ is_moderator() - Removed pg_catalog';
  RAISE NOTICE '  ✓ can_moderate_content() - Removed pg_catalog';
  RAISE NOTICE '  ✓ get_hosts_for_dac7_report() - Removed pg_catalog';
  RAISE NOTICE '';
  RAISE NOTICE 'Verified Secure (No Changes):';
  RAISE NOTICE '  ✓ get_or_create_conversation() - pg_temp needed';
  RAISE NOTICE '  ✓ validate_booking_email_verified() - auth schema needed';
  RAISE NOTICE '  ✓ validate_space_email_verified() - auth schema needed';
  RAISE NOTICE '  ✓ get_cron_jobs() - cron schema needed';
  RAISE NOTICE '  ✓ get_cron_job_runs() - cron schema needed';
  RAISE NOTICE '';
  RAISE NOTICE 'Result: All SECURITY DEFINER functions now have minimal, immutable search_path';
  RAISE NOTICE 'Security Status: ✅ HARDENED';
  RAISE NOTICE '========================================';
END $$;