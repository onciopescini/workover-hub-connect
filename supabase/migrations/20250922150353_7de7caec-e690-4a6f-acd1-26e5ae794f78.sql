-- Keep SECURITY DEFINER on get_public_spaces_safe to avoid RLS regressions
DROP FUNCTION IF EXISTS public.get_public_spaces_safe();

CREATE OR REPLACE FUNCTION public.get_public_spaces_safe()
RETURNS SETOF public.spaces_public_view
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT *
  FROM public.spaces_public_view
  ORDER BY created_at DESC
  LIMIT 200;
$$;

-- Revoke all permissions first, then grant specific ones
REVOKE ALL ON FUNCTION public.get_public_spaces_safe() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_spaces_safe() TO anon, authenticated;