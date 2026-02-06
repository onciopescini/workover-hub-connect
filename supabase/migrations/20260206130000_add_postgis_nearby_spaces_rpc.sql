-- ============================================
-- Server-side geospatial search upgrade (PostGIS)
-- ============================================

-- 1) Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2) Add geography column to spaces
ALTER TABLE public.spaces
ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- 3) Backfill location from latitude/longitude
UPDATE public.spaces
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;

-- Keep location synchronized going forward
CREATE OR REPLACE FUNCTION public.set_spaces_location_from_lat_lng()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_spaces_location_from_lat_lng ON public.spaces;

CREATE TRIGGER trg_set_spaces_location_from_lat_lng
BEFORE INSERT OR UPDATE OF latitude, longitude
ON public.spaces
FOR EACH ROW
EXECUTE FUNCTION public.set_spaces_location_from_lat_lng();

-- 4) Spatial index for ST_DWithin/ST_Distance
CREATE INDEX IF NOT EXISTS idx_spaces_location_geog
ON public.spaces
USING GIST (location);

-- 5) RPC: get_nearby_spaces
CREATE OR REPLACE FUNCTION public.get_nearby_spaces(
  lat double precision,
  long double precision,
  radius_meters integer DEFAULT 10000,
  "limit" integer DEFAULT 50,
  "offset" integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  host_id uuid,
  title text,
  description text,
  address text,
  city_name text,
  latitude double precision,
  longitude double precision,
  price_per_hour numeric,
  price_per_day numeric,
  max_capacity integer,
  amenities text[],
  photos text[],
  category public.space_category,
  published boolean,
  cached_avg_rating numeric,
  cached_review_count integer,
  workspace_features text[],
  seating_types text[],
  work_environment public.work_environment,
  confirmation_type public.confirmation_type,
  distance_meters double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.host_id,
    s.title,
    s.description,
    s.address,
    s.city_name,
    s.latitude,
    s.longitude,
    s.price_per_hour,
    s.price_per_day,
    s.max_capacity,
    s.amenities,
    s.photos,
    s.category,
    s.published,
    s.cached_avg_rating,
    s.cached_review_count,
    s.workspace_features,
    s.seating_types,
    s.work_environment,
    s.confirmation_type,
    ST_Distance(
      s.location,
      ST_SetSRID(ST_MakePoint(long, lat), 4326)::geography
    ) AS distance_meters
  FROM public.spaces AS s
  WHERE s.published = true
    AND s.is_suspended = false
    AND s.pending_approval = false
    AND s.location IS NOT NULL
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(long, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY ST_Distance(
      s.location,
      ST_SetSRID(ST_MakePoint(long, lat), 4326)::geography
    ) ASC
  LIMIT "limit"
  OFFSET "offset";
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_spaces(double precision, double precision, integer, integer, integer)
TO anon, authenticated;
