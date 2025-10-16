-- Update get_space_with_host_info to include host_total_spaces
DROP FUNCTION IF EXISTS public.get_space_with_host_info(uuid);

CREATE OR REPLACE FUNCTION public.get_space_with_host_info(space_id_param uuid)
RETURNS TABLE (
  id uuid,
  title text,
  name text,
  description text,
  category text,
  subcategory text,
  photos text[],
  price_per_day numeric,
  price_per_hour numeric,
  address text,
  latitude double precision,
  longitude double precision,
  max_capacity integer,
  workspace_features text[],
  amenities text[],
  work_environment text,
  seating_type text,
  confirmation_type text,
  published boolean,
  created_at timestamptz,
  host_stripe_account_id text,
  host_stripe_connected boolean,
  host_first_name text,
  host_last_name text,
  host_profile_photo text,
  host_bio text,
  host_networking_enabled boolean,
  host_created_at timestamptz,
  host_total_spaces bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.title,
    s.title as name,
    s.description,
    s.category::text,
    NULL::text as subcategory,
    s.photos,
    s.price_per_day,
    s.price_per_hour,
    s.address,
    s.latitude,
    s.longitude,
    s.max_capacity,
    s.workspace_features,
    s.amenities,
    s.work_environment::text,
    NULLIF(array_to_string(s.seating_types, ','), '')::text as seating_type,
    s.confirmation_type::text,
    s.published,
    s.created_at,
    p.stripe_account_id::text as host_stripe_account_id,
    COALESCE(p.stripe_connected, false) as host_stripe_connected,
    p.first_name as host_first_name,
    p.last_name as host_last_name,
    p.profile_photo_url as host_profile_photo,
    p.bio as host_bio,
    p.networking_enabled as host_networking_enabled,
    p.created_at as host_created_at,
    (SELECT COUNT(*) FROM public.spaces WHERE host_id = s.host_id AND published = true AND is_suspended = false) as host_total_spaces
  FROM public.spaces s
  LEFT JOIN public.profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param
    AND COALESCE(s.published, true) = true
    AND COALESCE(s.is_suspended, false) = false
  LIMIT 1;
$$;

-- Restore permissions
REVOKE ALL ON FUNCTION public.get_space_with_host_info(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_space_with_host_info(uuid) TO anon, authenticated;