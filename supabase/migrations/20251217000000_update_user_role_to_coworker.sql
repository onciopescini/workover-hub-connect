-- 1. Add 'coworker' to app_role enum if it doesn't exist
-- Note: 'ALTER TYPE ... ADD VALUE' cannot be run inside a transaction block in some contexts,
-- but usually Supabase SQL Editor handles it. We use a DO block to prevent errors if it exists.
DO $$
BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'coworker';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Migrate existing users with role 'user' to 'coworker'
UPDATE user_roles
SET role = 'coworker'
WHERE role = 'user';

-- 3. Enforce strict role validation by adding a CHECK constraint
-- This effectively deprecates 'user' without needing to drop/recreate the ENUM type
-- (which is risky due to dependencies in functions and other views).
ALTER TABLE user_roles
DROP CONSTRAINT IF EXISTS check_role_validity;

ALTER TABLE user_roles
ADD CONSTRAINT check_role_validity
CHECK (role IN ('admin', 'moderator', 'host', 'coworker'));
