-- ============================================================================
-- SECURITY HARDENING MIGRATION
-- Addresses 3 Critical Security Issues:
-- 1. Rate Limits Overly Permissive Access
-- 2. Profiles Exposing Sensitive Personal Data  
-- 3. Host GPS Coordinates and Addresses Publicly Exposed
-- ============================================================================

-- ============================================================================
-- ISSUE 1: FIX RATE_LIMITS OVERLY PERMISSIVE ACCESS
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "System insert rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Admins view rate limits" ON public.rate_limits;

-- Create secure policies: Admin-only access
CREATE POLICY "rate_limits_admin_select" 
ON public.rate_limits FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "rate_limits_admin_update" 
ON public.rate_limits FOR UPDATE
USING (is_admin(auth.uid()));

-- Allow system to insert (for rate limiting to work)
CREATE POLICY "rate_limits_system_insert" 
ON public.rate_limits FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- ISSUE 2: FIX PROFILES EXPOSING SENSITIVE DATA
-- ============================================================================

-- Create safe public view excluding sensitive personal data
CREATE OR REPLACE VIEW profiles_public_safe AS
SELECT 
  id,
  first_name,
  last_name,
  nickname,
  profile_photo_url,
  bio,
  profession,
  job_title,
  -- Only city, not full location
  city,
  skills,
  interests,
  networking_enabled,
  collaboration_availability,
  collaboration_description,
  collaboration_types,
  preferred_work_mode,
  industries,
  competencies,
  created_at
  -- EXCLUDED: phone, email, linkedin_url, instagram_url, twitter_url, 
  -- facebook_url, youtube_url, github_url, website, location (full), 
  -- legal_address, iban, tax details, etc.
FROM public.profiles
WHERE networking_enabled = true 
  AND is_suspended = false;

-- Grant public access to safe view
GRANT SELECT ON profiles_public_safe TO authenticated, anon;

-- ============================================================================
-- ISSUE 3: FIX HOST LOCATION EXPOSURE
-- ============================================================================

-- 3.1 Create backup of spaces table
CREATE TABLE IF NOT EXISTS public.spaces_backup_20250115_security AS 
SELECT * FROM public.spaces;

-- 3.2 Create secure location table with RLS
CREATE TABLE IF NOT EXISTS public.space_locations (
  space_id UUID PRIMARY KEY REFERENCES public.spaces(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.space_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for space_locations: Only owner, confirmed bookers, or admins
CREATE POLICY "space_locations_owner_access" 
ON public.space_locations FOR ALL
USING (
  space_id IN (
    SELECT id FROM public.spaces WHERE host_id = auth.uid()
  )
)
WITH CHECK (
  space_id IN (
    SELECT id FROM public.spaces WHERE host_id = auth.uid()
  )
);

CREATE POLICY "space_locations_confirmed_booking_access" 
ON public.space_locations FOR SELECT
USING (
  space_id IN (
    SELECT space_id FROM public.bookings 
    WHERE user_id = auth.uid() 
      AND status = 'confirmed'
      AND booking_date >= CURRENT_DATE
  )
);

CREATE POLICY "space_locations_admin_access" 
ON public.space_locations FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 3.3 Migrate existing location data
INSERT INTO public.space_locations (space_id, latitude, longitude, address)
SELECT id, latitude, longitude, address
FROM public.spaces
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND address IS NOT NULL
ON CONFLICT (space_id) DO NOTHING;

-- 3.4 Add city-level location columns to spaces (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='spaces' AND column_name='city_name') THEN
    ALTER TABLE public.spaces ADD COLUMN city_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='spaces' AND column_name='country_code') THEN
    ALTER TABLE public.spaces ADD COLUMN country_code TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='spaces' AND column_name='approximate_location') THEN
    ALTER TABLE public.spaces ADD COLUMN approximate_location POINT;
  END IF;
END $$;

-- 3.5 Populate city-level data from existing addresses
UPDATE public.spaces
SET 
  city_name = TRIM(SPLIT_PART(address, ',', -2)),
  country_code = TRIM(SPLIT_PART(address, ',', -1))
WHERE address IS NOT NULL AND city_name IS NULL;

-- 3.6 Create public-safe view for spaces
CREATE OR REPLACE VIEW spaces_public_safe AS
SELECT 
  id,
  title,
  description,
  category,
  work_environment,
  max_capacity,
  confirmation_type,
  workspace_features,
  amenities,
  seating_types,
  ideal_guest_tags,
  event_friendly_tags,
  price_per_hour,
  price_per_day,
  photos,
  rules,
  availability,
  cancellation_policy,
  -- Only city-level location
  city_name,
  country_code,
  approximate_location,
  published,
  created_at,
  updated_at
  -- EXCLUDED: host_id, latitude, longitude, address
FROM public.spaces
WHERE published = true 
  AND is_suspended = false 
  AND NOT pending_approval
  AND deleted_at IS NULL;

-- Grant public access to safe view
GRANT SELECT ON spaces_public_safe TO authenticated, anon;

-- 3.7 Create function to sync city-level data
CREATE OR REPLACE FUNCTION sync_space_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Update spaces table with city-level data when space_locations changes
  UPDATE public.spaces
  SET 
    city_name = TRIM(SPLIT_PART(NEW.address, ',', -2)),
    country_code = TRIM(SPLIT_PART(NEW.address, ',', -1)),
    updated_at = NOW()
  WHERE id = NEW.space_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.8 Create trigger for automatic sync
DROP TRIGGER IF EXISTS sync_space_location_on_update ON public.space_locations;
CREATE TRIGGER sync_space_location_on_update
  AFTER INSERT OR UPDATE ON public.space_locations
  FOR EACH ROW
  EXECUTE FUNCTION sync_space_location();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================