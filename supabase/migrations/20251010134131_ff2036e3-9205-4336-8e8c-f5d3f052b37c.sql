-- Migration: Move Extensions to Dedicated Schema
-- Move extensions from public schema to dedicated extensions schema to prevent conflicts and privilege escalation

-- Step 1: Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Step 2: Grant necessary permissions on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA extensions TO postgres;

-- Step 3: Move uuid-ossp extension (most commonly used)
-- First check if it exists in public schema, then recreate in extensions schema
DO $$
BEGIN
  -- Drop from public if exists
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'uuid-ossp' AND n.nspname = 'public'
  ) THEN
    DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
  END IF;
  
  -- Create in extensions schema
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
END $$;

-- Step 4: Move pg_crypto extension if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pgcrypto' AND n.nspname = 'public'
  ) THEN
    DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;
  END IF;
  
  CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
END $$;

-- Step 5: Move pgvector extension if exists (for vector search)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    DROP EXTENSION IF EXISTS "vector" CASCADE;
  END IF;
  
  -- Try to create pgvector, ignore if not available
  BEGIN
    CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    -- pgvector might not be available, skip silently
    NULL;
  END;
END $$;

-- Step 6: Update database search_path to include extensions schema
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Step 7: Verify no extensions remain in public schema
DO $$
DECLARE
  ext_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO ext_count
  FROM pg_extension e
  JOIN pg_namespace n ON e.extnamespace = n.oid
  WHERE n.nspname = 'public';
  
  IF ext_count > 0 THEN
    RAISE WARNING 'Still % extension(s) in public schema - manual review required', ext_count;
  END IF;
END $$;