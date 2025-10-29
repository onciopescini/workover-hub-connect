-- =====================================================
-- FIX: Security Advisor Issues - security_definer_functions_audit View
-- Date: 2025-01-31
-- Issue: View created with SECURITY DEFINER bypasses RLS
-- Fix: Recreate as SECURITY DEFINER function with admin check
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.security_definer_functions_audit CASCADE;

-- Create admin-only function to audit SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.get_security_definer_audit()
RETURNS TABLE(
  schema text,
  function_name text,
  security_mode text,
  arguments text,
  has_auth_check boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only admins can call this function
  SELECT 
    n.nspname::text as schema,
    p.proname::text as function_name,
    CASE p.prosecdef
      WHEN true THEN '⚠️  SECURITY DEFINER'
      ELSE '✅ SECURITY INVOKER'
    END::text as security_mode,
    pg_get_function_arguments(p.oid)::text as arguments,
    (pg_get_functiondef(p.oid) LIKE '%is_admin%' 
     OR pg_get_functiondef(p.oid) LIKE '%auth.uid()%'
     OR pg_get_functiondef(p.oid) LIKE '%has_role%') as has_auth_check
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prosecdef = true
    AND public.is_admin(auth.uid())  -- ⚠️ Authorization check: only admins
  ORDER BY p.proname;
$$;

COMMENT ON FUNCTION public.get_security_definer_audit IS 
'Admin-only function to audit SECURITY DEFINER functions. Requires admin role. Converted from view to enforce RLS.';

-- Grant execute only to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.get_security_definer_audit() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_security_definer_audit() FROM anon;