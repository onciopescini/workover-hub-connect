-- =====================================================
-- FIX: Security Advisor Issues - Move pg_net to extensions schema
-- Date: 2025-01-31
-- Issue: pg_net extension in public schema (exposed to PostgREST)
-- Fix: Move to dedicated extensions schema
-- =====================================================

-- 1. Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Grant usage to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;

-- 3. Check if pg_net exists and drop/recreate in extensions schema
DO $$ 
BEGIN
  -- Drop pg_net from public if it exists
  IF EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'pg_net' 
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    DROP EXTENSION IF EXISTS pg_net CASCADE;
    RAISE NOTICE 'Dropped pg_net from public schema';
  END IF;
  
  -- Create pg_net in extensions schema
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  RAISE NOTICE 'Created pg_net in extensions schema';
END $$;

-- 4. Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres;

COMMENT ON SCHEMA extensions IS 
'Schema for PostgreSQL extensions (pg_net, etc.) - separated from public schema for security best practices';

COMMENT ON EXTENSION pg_net IS
'Async HTTP client for PostgreSQL - moved to extensions schema per Supabase security advisor';