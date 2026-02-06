-- Add server-side pagination support to space search RPCs.

DROP FUNCTION IF EXISTS public.search_spaces_by_radius(
  double precision,
  double precision,
  double precision,
  text,
  text,
  numeric,
  numeric,
  text[],
  integer,
  integer
);

CREATE FUNCTION public.search_spaces_by_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 10,
  p_category text DEFAULT NULL,
  p_work_environment text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_amenities text[] DEFAULT NULL,
  p_min_capacity integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.spaces
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.spaces AS s
  WHERE s.is_active = true
    AND s.is_approved = true
    AND s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000.0
    )
    AND (p_category IS NULL OR s.category::text = p_category)
    AND (p_work_environment IS NULL OR s.work_environment::text = p_work_environment)
    AND (p_min_price IS NULL OR COALESCE(s.price_per_hour, s.price_per_day, 0) >= p_min_price)
    AND (p_max_price IS NULL OR COALESCE(s.price_per_hour, s.price_per_day, 0) <= p_max_price)
    AND (p_min_capacity IS NULL OR s.max_capacity >= p_min_capacity)
    AND (
      p_amenities IS NULL
      OR cardinality(p_amenities) = 0
      OR s.amenities @> p_amenities
    )
  ORDER BY ST_Distance(
    ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326)::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  ) ASC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.search_spaces_by_radius(
  double precision,
  double precision,
  double precision,
  text,
  text,
  numeric,
  numeric,
  text[],
  integer,
  integer,
  integer
) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.search_spaces_by_location_text(
  text,
  text,
  text,
  numeric,
  numeric,
  text[],
  integer,
  integer
);

CREATE FUNCTION public.search_spaces_by_location_text(
  p_search_text text,
  p_category text DEFAULT NULL,
  p_work_environment text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_amenities text[] DEFAULT NULL,
  p_min_capacity integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.spaces
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.spaces AS s
  WHERE s.is_active = true
    AND s.is_approved = true
    AND (
      lower(coalesce(s.address, '')) LIKE lower('%' || p_search_text || '%')
      OR lower(coalesce(s.city_name, '')) LIKE lower('%' || p_search_text || '%')
    )
    AND (p_category IS NULL OR s.category::text = p_category)
    AND (p_work_environment IS NULL OR s.work_environment::text = p_work_environment)
    AND (p_min_price IS NULL OR COALESCE(s.price_per_hour, s.price_per_day, 0) >= p_min_price)
    AND (p_max_price IS NULL OR COALESCE(s.price_per_hour, s.price_per_day, 0) <= p_max_price)
    AND (p_min_capacity IS NULL OR s.max_capacity >= p_min_capacity)
    AND (
      p_amenities IS NULL
      OR cardinality(p_amenities) = 0
      OR s.amenities @> p_amenities
    )
  ORDER BY
    CASE WHEN lower(coalesce(s.city_name, '')) = lower(p_search_text) THEN 1 ELSE 2 END,
    s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.search_spaces_by_location_text(
  text,
  text,
  text,
  numeric,
  numeric,
  text[],
  integer,
  integer,
  integer
) TO anon, authenticated;
