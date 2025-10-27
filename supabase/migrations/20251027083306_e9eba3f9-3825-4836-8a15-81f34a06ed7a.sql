-- Enable PostGIS extension for geographic operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify extension is loaded
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) THEN
    RAISE EXCEPTION 'PostGIS extension could not be enabled';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON EXTENSION postgis IS 'PostGIS geometry, geography, and raster spatial types and functions';

-- Test that geography type works
DO $$
DECLARE
  test_distance double precision;
BEGIN
  test_distance := ST_Distance(
    ST_SetSRID(ST_MakePoint(0, 0), 4326)::geography,
    ST_SetSRID(ST_MakePoint(1, 1), 4326)::geography
  );
  
  RAISE NOTICE 'PostGIS test distance: % meters', test_distance;
END $$;