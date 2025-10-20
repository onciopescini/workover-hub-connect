
-- Create a view that includes user roles
-- This allows the frontend to access roles without major refactoring
CREATE OR REPLACE VIEW profiles_with_role AS
SELECT 
  p.*,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
  AND ur.role IN ('host', 'admin'); -- Prioritize host/admin roles

-- Create RPC function to get current user's primary role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM user_roles
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'host' THEN 2
      WHEN 'moderator' THEN 3
      WHEN 'user' THEN 4
    END
  LIMIT 1;
$$;

-- Grant access
GRANT SELECT ON profiles_with_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;

COMMENT ON VIEW profiles_with_role IS 'Profiles with their primary role from user_roles table';
COMMENT ON FUNCTION get_my_role() IS 'Returns the current authenticated user primary role';
