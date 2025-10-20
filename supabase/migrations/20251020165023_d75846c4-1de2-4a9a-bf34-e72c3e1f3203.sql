-- Add computed role column to profiles
-- This reads from user_roles but allows existing code to work

-- Create helper function to get user's primary role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM user_roles 
  WHERE user_id = user_uuid
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'host' THEN 2
      WHEN 'moderator' THEN 3
      WHEN 'user' THEN 4
    END
  LIMIT 1;
$$;

-- Add role column to profiles (nullable for now)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role app_role;

-- Populate existing profiles with their primary role
UPDATE profiles 
SET role = get_user_role(id)
WHERE role IS NULL;

-- Create trigger to keep role in sync
CREATE OR REPLACE FUNCTION sync_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET role = get_user_role(NEW.user_id)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_role_on_user_roles_change ON user_roles;
CREATE TRIGGER sync_role_on_user_roles_change
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_role();