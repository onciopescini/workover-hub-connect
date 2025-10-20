-- CRITICAL SECURITY FIX: Remove dual role system
-- Migration: Remove redundant profiles.role column
-- All role checks must use user_roles table via has_role() function

-- Step 1: Verify all admins from profiles.role are in user_roles table
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT id, 'admin'::app_role, created_at
FROM public.profiles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Verify all hosts from profiles.role are in user_roles table
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT id, 'host'::app_role, created_at
FROM public.profiles
WHERE role = 'host'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Drop all sync triggers and functions with CASCADE
DROP TRIGGER IF EXISTS sync_role_on_user_roles_change ON user_roles CASCADE;
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON user_roles CASCADE;
DROP FUNCTION IF EXISTS sync_profile_role() CASCADE;

-- Step 4: Check for any RLS policies that reference profiles.role
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname, qual
    FROM pg_policies
    WHERE schemaname = 'public'
    AND (qual LIKE '%profiles.role%' OR qual LIKE '%p.role%')
  LOOP
    RAISE NOTICE 'Policy % on table % may reference profiles.role and needs manual review', 
      policy_record.policyname, policy_record.tablename;
  END LOOP;
END $$;

-- Step 5: Remove the role column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- Step 6: Add comment for future developers
COMMENT ON TABLE user_roles IS 'CRITICAL SECURITY: This is the ONLY authoritative source for user roles. Never add role columns to other tables to prevent privilege escalation attacks.';

-- Step 7: Verify the column is removed
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'role';
  
  IF col_count > 0 THEN
    RAISE EXCEPTION 'Failed to remove profiles.role column';
  ELSE
    RAISE NOTICE 'SUCCESS: profiles.role column removed. Role system is now secure.';
  END IF;
END $$;