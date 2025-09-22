-- Drop previous version if exists
DROP FUNCTION IF EXISTS public.get_space_with_host_info(uuid);

-- Minimal stable function for space detail with only existing columns
CREATE OR REPLACE FUNCTION public.get_space_with_host_info(space_id_param uuid)
RETURNS TABLE (
  id uuid,
  name text,
  price_per_hour numeric,
  price_per_day numeric,
  host_stripe_account_id text,
  category text,
  subcategory text,          -- exposed as NULL for compatibility
  work_environment text,
  max_capacity integer,
  address text,
  confirmation_type text,
  created_at timestamptz,
  photos jsonb,
  amenities jsonb,
  workspace_features jsonb,
  description text,
  latitude numeric,
  longitude numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.title as name,
    s.price_per_hour,
    s.price_per_day,
    p.stripe_account_id::text as host_stripe_account_id,
    s.category,
    null::text as subcategory,   -- ← no reference to s.subcategory
    s.work_environment,
    s.max_capacity,
    s.address,
    s.confirmation_type,
    s.created_at,
    s.photos,
    s.amenities,
    s.workspace_features,
    s.description,
    s.latitude,
    s.longitude
  FROM public.spaces s
  LEFT JOIN public.profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param
  LIMIT 1;
$$;

-- Revoke all permissions first, then grant specific ones
REVOKE ALL ON FUNCTION public.get_space_with_host_info(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_space_with_host_info(uuid) TO anon, authenticated;