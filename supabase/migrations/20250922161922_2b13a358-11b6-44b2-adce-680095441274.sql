-- Drop versione precedente
DROP FUNCTION IF EXISTS public.get_space_with_host_info(uuid);

-- Ricrea la function mappando seating_type dalla colonna reale seating_types (ARRAY)
CREATE OR REPLACE FUNCTION public.get_space_with_host_info(space_id_param UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  name TEXT,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  photos TEXT[],
  price_per_day NUMERIC,
  price_per_hour NUMERIC,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  max_capacity INTEGER,
  workspace_features TEXT[],
  amenities TEXT[],
  work_environment TEXT,
  seating_type TEXT,            -- <- la UI si aspetta una stringa
  ideal_guest TEXT,
  confirmation_type TEXT,
  published BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  host_stripe_account_id TEXT,
  host_first_name TEXT,
  host_last_name TEXT,
  host_profile_photo TEXT,
  host_bio TEXT,
  host_networking_enabled BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.title,
    s.title AS name,
    s.description,
    s.category::text,
    NULL::text AS subcategory,
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
    -- Mappa dall'array seating_types a una stringa (es. "desk,sofa,bench")
    NULLIF(array_to_string(s.seating_types, ','), '')::text AS seating_type,
    NULL::text AS ideal_guest,  -- Column doesn't exist, return NULL
    s.confirmation_type::text,
    s.published,
    s.created_at,
    p.stripe_account_id::text AS host_stripe_account_id,
    p.first_name AS host_first_name,
    p.last_name AS host_last_name,
    p.profile_photo_url AS host_profile_photo,
    p.bio AS host_bio,
    p.networking_enabled AS host_networking_enabled
  FROM public.spaces s
  LEFT JOIN public.profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param
    AND COALESCE(s.published, true) = true
    AND COALESCE(s.is_suspended, false) = false;
$$;

-- Permessi
REVOKE ALL ON FUNCTION public.get_space_with_host_info(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_space_with_host_info(uuid) TO anon, authenticated;