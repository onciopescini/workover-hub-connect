-- Drop and recreate is_host_of_space with correct parameters
DROP FUNCTION IF EXISTS public.is_host_of_space(uuid, uuid) CASCADE;

CREATE FUNCTION public.is_host_of_space(p_space_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM spaces WHERE id = p_space_id AND host_id = p_user_id
  );
$$;