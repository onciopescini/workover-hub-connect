-- ============================================
-- FASE 1: Sistema di Ricerca Geografica Unificato
-- ============================================

-- 1.1: Modificare spaces_public_safe VIEW per esporre address completo
DROP VIEW IF EXISTS public.spaces_public_safe CASCADE;

CREATE VIEW public.spaces_public_safe AS
SELECT 
  id,
  category,
  work_environment,
  max_capacity,
  confirmation_type,
  price_per_hour,
  price_per_day,
  availability,
  cancellation_policy,
  approximate_location,    -- Privacy: coordinate approssimate
  address,                 -- NEW: indirizzo completo per ricerca
  published,
  created_at,
  updated_at,
  country_code,
  workspace_features,
  amenities,
  seating_types,
  ideal_guest_tags,
  event_friendly_tags,
  photos,
  rules,
  city_name,
  title,
  description
FROM public.spaces s
WHERE published = true 
  AND is_suspended = false 
  AND pending_approval = false;

GRANT SELECT ON public.spaces_public_safe TO anon, authenticated;

-- 1.2: Creare RPC per Ricerca Geografica con Raggio
CREATE OR REPLACE FUNCTION public.search_spaces_by_radius(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km INTEGER DEFAULT 10,
  p_category TEXT DEFAULT NULL,
  p_work_environment TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_amenities TEXT[] DEFAULT NULL,
  p_min_capacity INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  work_environment TEXT,
  max_capacity INTEGER,
  price_per_hour NUMERIC,
  price_per_day NUMERIC,
  address TEXT,
  city_name TEXT,
  country_code TEXT,
  approximate_location POINT,
  distance_km NUMERIC,
  amenities TEXT[],
  workspace_features TEXT[],
  seating_types TEXT[],
  photos TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.category::TEXT,
    s.work_environment::TEXT,
    s.max_capacity,
    s.price_per_hour,
    s.price_per_day,
    s.address,
    s.city_name,
    s.country_code,
    s.approximate_location,
    -- Calculate distance in km from approximate_location
    ROUND(
      (ST_Distance(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        ST_SetSRID(s.approximate_location, 4326)::geography
      ) / 1000)::numeric, 
      2
    ) AS distance_km,
    s.amenities,
    s.workspace_features,
    s.seating_types,
    s.photos,
    s.created_at
  FROM public.spaces s
  WHERE 
    s.published = true
    AND s.is_suspended = false
    AND s.pending_approval = false
    AND s.approximate_location IS NOT NULL
    -- Radius filter (using approximate_location for privacy)
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      ST_SetSRID(s.approximate_location, 4326)::geography,
      p_radius_km * 1000  -- convert km to meters
    )
    -- Optional filters
    AND (p_category IS NULL OR s.category::TEXT = p_category)
    AND (p_work_environment IS NULL OR s.work_environment::TEXT = p_work_environment)
    AND (p_min_price IS NULL OR s.price_per_hour >= p_min_price)
    AND (p_max_price IS NULL OR s.price_per_hour <= p_max_price)
    AND (p_min_capacity IS NULL OR s.max_capacity >= p_min_capacity)
    AND (p_amenities IS NULL OR s.amenities && p_amenities)  -- array overlap
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_spaces_by_radius TO anon, authenticated;

COMMENT ON FUNCTION public.search_spaces_by_radius IS 
'Search spaces within radius from coordinates, ordered by distance. Uses approximate_location for privacy.';

-- 1.3: Creare RPC per Ricerca per Indirizzo/Città
CREATE OR REPLACE FUNCTION public.search_spaces_by_location_text(
  p_search_text TEXT,
  p_category TEXT DEFAULT NULL,
  p_work_environment TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_amenities TEXT[] DEFAULT NULL,
  p_min_capacity INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  work_environment TEXT,
  max_capacity INTEGER,
  price_per_hour NUMERIC,
  price_per_day NUMERIC,
  address TEXT,
  city_name TEXT,
  country_code TEXT,
  approximate_location POINT,
  amenities TEXT[],
  workspace_features TEXT[],
  seating_types TEXT[],
  photos TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.category::TEXT,
    s.work_environment::TEXT,
    s.max_capacity,
    s.price_per_hour,
    s.price_per_day,
    s.address,
    s.city_name,
    s.country_code,
    s.approximate_location,
    s.amenities,
    s.workspace_features,
    s.seating_types,
    s.photos,
    s.created_at
  FROM public.spaces s
  WHERE 
    s.published = true
    AND s.is_suspended = false
    AND s.pending_approval = false
    -- Search in address OR city_name (case-insensitive)
    AND (
      LOWER(s.address) LIKE LOWER('%' || p_search_text || '%')
      OR LOWER(s.city_name) LIKE LOWER('%' || p_search_text || '%')
    )
    -- Optional filters
    AND (p_category IS NULL OR s.category::TEXT = p_category)
    AND (p_work_environment IS NULL OR s.work_environment::TEXT = p_work_environment)
    AND (p_min_price IS NULL OR s.price_per_hour >= p_min_price)
    AND (p_max_price IS NULL OR s.price_per_hour <= p_max_price)
    AND (p_min_capacity IS NULL OR s.max_capacity >= p_min_capacity)
    AND (p_amenities IS NULL OR s.amenities && p_amenities)
  ORDER BY 
    -- Prioritize exact city match
    CASE WHEN LOWER(s.city_name) = LOWER(p_search_text) THEN 1 ELSE 2 END,
    s.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_spaces_by_location_text TO anon, authenticated;

COMMENT ON FUNCTION public.search_spaces_by_location_text IS 
'Text-based search in address and city_name fields. Prioritizes exact city matches.';