-- Fix Security and Search: Hide spaces from unconnected hosts
-- Migration ID: 20251219000000_fix_security_and_search

-- ============================================
-- 1. Update Profiles RLS (Step 1)
-- ============================================

-- Allow Public (anon + authenticated) to read profile data
-- This is necessary for the SpaceDetail page to check 'stripe_connected' before booking
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;

CREATE POLICY "Public profiles access"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);


-- ============================================
-- 2. Update Workspaces RLS (Step 2)
-- ============================================

-- Drop the old policy that only checked 'published = true'
DROP POLICY IF EXISTS "Public can view published workspaces" ON public.workspaces;

-- Create new policy: Published AND Host is Stripe Connected
CREATE POLICY "Public can view published workspaces"
ON public.workspaces
FOR SELECT
TO anon, authenticated
USING (
  published = true
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = workspaces.host_id
    AND profiles.stripe_connected = true
  )
);

-- Note: Host-specific policies (view own) are preserved from previous migrations


-- ============================================
-- 3. Update 'spaces_public_safe' View
-- ============================================

DROP VIEW IF EXISTS public.spaces_public_safe CASCADE;

CREATE VIEW public.spaces_public_safe AS
SELECT
  w.id,
  w.name AS title,
  w.description,
  w.category,
  w.work_environment,
  w.max_capacity,
  w.price_per_hour,
  w.price_per_day,
  w.address,
  w.city AS city_name,
  'IT'::text AS country_code,
  -- Calculate approximate_location using PostGIS
  ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326) AS approximate_location,
  w.features AS workspace_features,
  w.amenities,
  w.seating_types,
  w.photos,
  w.photos AS images, -- Alias for legacy frontend support
  w.rules,
  w.availability,
  w.published,
  w.created_at,
  w.updated_at
FROM public.workspaces w
JOIN public.profiles p ON w.host_id = p.id
WHERE
  w.published = true
  AND p.stripe_connected = true;

GRANT SELECT ON public.spaces_public_safe TO anon, authenticated;


-- ============================================
-- 4. Update Search RPCs
-- ============================================

-- 4.1: search_spaces_by_radius
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
  approximate_location GEOMETRY,
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
    s.name AS title,
    s.description,
    s.category::TEXT,
    s.work_environment::TEXT,
    s.max_capacity,
    s.price_per_hour,
    s.price_per_day,
    s.address,
    s.city AS city_name,
    'IT'::text AS country_code,
    ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326) AS approximate_location,
    -- Calculate distance in km
    ROUND(
      (ST_Distance(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)::geography
      ) / 1000)::numeric,
      2
    ) AS distance_km,
    s.amenities,
    s.features AS workspace_features,
    s.seating_types,
    s.photos,
    s.created_at
  FROM public.workspaces s
  JOIN public.profiles p ON s.host_id = p.id
  WHERE
    s.published = true
    AND p.stripe_connected = true -- Only show connected hosts
    AND s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    -- Radius filter
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)::geography,
      p_radius_km * 1000
    )
    -- Optional filters
    AND (p_category IS NULL OR s.category::TEXT = p_category)
    AND (p_work_environment IS NULL OR s.work_environment::TEXT = p_work_environment)
    AND (p_min_price IS NULL OR s.price_per_hour >= p_min_price)
    AND (p_max_price IS NULL OR s.price_per_hour <= p_max_price)
    AND (p_min_capacity IS NULL OR s.max_capacity >= p_min_capacity)
    AND (p_amenities IS NULL OR s.amenities && p_amenities)
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_spaces_by_radius TO anon, authenticated;


-- 4.2: search_spaces_by_location_text
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
  approximate_location GEOMETRY,
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
    s.name AS title,
    s.description,
    s.category::TEXT,
    s.work_environment::TEXT,
    s.max_capacity,
    s.price_per_hour,
    s.price_per_day,
    s.address,
    s.city AS city_name,
    'IT'::text AS country_code,
    ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326) AS approximate_location,
    s.amenities,
    s.features AS workspace_features,
    s.seating_types,
    s.photos,
    s.created_at
  FROM public.workspaces s
  JOIN public.profiles p ON s.host_id = p.id
  WHERE
    s.published = true
    AND p.stripe_connected = true -- Only show connected hosts
    -- Search in address OR city (case-insensitive)
    AND (
      LOWER(s.address) LIKE LOWER('%' || p_search_text || '%')
      OR LOWER(s.city) LIKE LOWER('%' || p_search_text || '%')
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
    CASE WHEN LOWER(s.city) = LOWER(p_search_text) THEN 1 ELSE 2 END,
    s.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_spaces_by_location_text TO anon, authenticated;
