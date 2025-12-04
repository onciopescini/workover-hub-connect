-- Fix Public Listing Views and RPCs to use 'workspaces' table
-- Migration ID: 20251112100000_fix_public_listing

-- ============================================
-- 1. Ensure 'workspaces' Table Exists
-- ============================================

CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id UUID NOT NULL REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    city TEXT, -- Manually added in production, ensuring it exists here
    category public.space_category NOT NULL,
    work_environment public.work_environment,
    max_capacity INTEGER NOT NULL,
    price_per_hour NUMERIC,
    price_per_day NUMERIC,
    photos TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}', -- Maps to 'workspace_features'
    amenities TEXT[] DEFAULT '{}',
    seating_types TEXT[] DEFAULT '{}',
    ideal_guest_tags TEXT[] DEFAULT '{}',
    event_friendly_tags TEXT[] DEFAULT '{}',
    rules TEXT,
    availability JSONB,
    cancellation_policy public.cancellation_policy,
    confirmation_type public.confirmation_type,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Re-apply Policies (Idempotent)
DROP POLICY IF EXISTS "Public can view published workspaces" ON public.workspaces;
CREATE POLICY "Public can view published workspaces"
ON public.workspaces FOR SELECT
USING (published = true);

DROP POLICY IF EXISTS "Hosts can insert their own workspaces" ON public.workspaces;
CREATE POLICY "Hosts can insert their own workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update their own workspaces" ON public.workspaces;
CREATE POLICY "Hosts can update their own workspaces"
ON public.workspaces FOR UPDATE
USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can delete their own workspaces" ON public.workspaces;
CREATE POLICY "Hosts can delete their own workspaces"
ON public.workspaces FOR DELETE
USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can view their own workspaces (even unpublished)" ON public.workspaces;
CREATE POLICY "Hosts can view their own workspaces (even unpublished)"
ON public.workspaces FOR SELECT
USING (auth.uid() = host_id);


-- ============================================
-- 2. Fix 'spaces_public_safe' View
-- ============================================

DROP VIEW IF EXISTS public.spaces_public_safe CASCADE;

CREATE VIEW public.spaces_public_safe AS
SELECT
  id,
  name AS title,
  description,
  category,
  work_environment,
  max_capacity,
  price_per_hour,
  price_per_day,
  address,
  city AS city_name,
  'IT'::text AS country_code,
  -- Calculate approximate_location using PostGIS
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) AS approximate_location,
  features AS workspace_features,
  amenities,
  seating_types,
  photos,
  photos AS images, -- Alias for legacy frontend support
  rules,
  availability,
  published,
  created_at,
  updated_at
FROM public.workspaces
WHERE published = true;

GRANT SELECT ON public.spaces_public_safe TO anon, authenticated;


-- ============================================
-- 3. Update Search RPCs
-- ============================================

-- 3.1: search_spaces_by_radius
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
  approximate_location GEOMETRY, -- Changed to GEOMETRY to match ST_MakePoint output
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
  WHERE
    s.published = true
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


-- 3.2: search_spaces_by_location_text
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
  WHERE
    s.published = true
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
