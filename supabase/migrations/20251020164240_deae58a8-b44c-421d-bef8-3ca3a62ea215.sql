
-- Now that 'host' exists in the enum, assign roles to users with spaces
INSERT INTO user_roles (user_id, role)
SELECT DISTINCT s.host_id, 'host'::app_role
FROM spaces s
WHERE s.published = true
  AND s.host_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = s.host_id AND ur.role = 'host'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Also assign 'host' role to users with stripe connected
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'host'::app_role
FROM profiles p
WHERE p.stripe_connected = true
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'host'
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Add computed/helper function to get primary role for a user
CREATE OR REPLACE FUNCTION get_user_primary_role(user_uuid uuid)
RETURNS app_role
LANGUAGE sql
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

GRANT EXECUTE ON FUNCTION get_user_primary_role(uuid) TO authenticated;

COMMENT ON FUNCTION get_user_primary_role(uuid) IS 'Returns the primary role for a given user, prioritizing admin > host > moderator > user';
