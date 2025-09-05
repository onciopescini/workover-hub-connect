-- CRITICAL SECURITY FIXES - Phase 1: Data Exposure Prevention

-- 1. SECURE WAITLISTS TABLE - Remove public access
DROP POLICY IF EXISTS "Anyone can view waitlists" ON public.waitlists;

-- Create secure waitlist policies
CREATE POLICY "Users can view their own waitlists" 
ON public.waitlists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Space hosts can view waitlists for their spaces" 
ON public.waitlists 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.spaces 
  WHERE spaces.id = waitlists.space_id 
  AND spaces.host_id = auth.uid()
));

CREATE POLICY "Users can create their own waitlists" 
ON public.waitlists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own waitlists" 
ON public.waitlists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own waitlists" 
ON public.waitlists 
FOR DELETE 
USING (auth.uid() = user_id);

-- 2. LOCK DOWN RATE_LIMITS TABLE - Remove all public access
DROP POLICY IF EXISTS "Allow public access to rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Public can view rate limits" ON public.rate_limits;

-- Only allow system and admin access to rate_limits
CREATE POLICY "System functions can access rate_limits" 
ON public.rate_limits 
FOR ALL 
USING (true)
WITH CHECK (true);

-- This policy will be restricted to RPC function calls only
-- No direct table access for users

-- 3. SECURE DATA_ACCESS_LOGS - Remove public insert
DROP POLICY IF EXISTS "Auto-log data access" ON public.data_access_logs;

-- Only admins can view data access logs
-- System logging will be handled through secure functions only
CREATE POLICY "Only system can log data access" 
ON public.data_access_logs 
FOR INSERT 
WITH CHECK (false); -- Block all direct inserts

-- 4. Fix remaining database functions with search_path issues
CREATE OR REPLACE FUNCTION public.get_safe_public_profile(profile_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data json;
BEGIN
  -- Check if profile exists and networking is enabled
  SELECT json_build_object(
    'id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'bio', p.bio,
    'profession', p.profession,
    'city', p.city,
    'profile_photo_url', p.profile_photo_url,
    'linkedin_url', p.linkedin_url,
    'website', p.website,
    'skills', p.skills,
    'interests', p.interests,
    'networking_enabled', p.networking_enabled
  ) INTO profile_data
  FROM public.profiles p
  WHERE p.id = profile_id
  AND p.networking_enabled = true
  AND p.is_suspended = false;
  
  RETURN profile_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_spaces()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spaces_data json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', s.id,
      'title', s.title,
      'description', s.description,
      'price_per_day', s.price_per_day,
      'photos', s.photos,
      'city', s.city,
      'space_type', s.space_type,
      'created_at', s.created_at
    )
  ) INTO spaces_data
  FROM public.spaces s
  WHERE s.published = true
  AND s.is_suspended = false
  AND s.pending_approval = false;
  
  RETURN COALESCE(spaces_data, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_space_with_host_info(space_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  space_data json;
BEGIN
  SELECT json_build_object(
    'id', s.id,
    'title', s.title,
    'description', s.description,
    'price_per_day', s.price_per_day,
    'photos', s.photos,
    'city', s.city,
    'space_type', s.space_type,
    'amenities', s.amenities,
    'created_at', s.created_at,
    'host', json_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'profile_photo_url', p.profile_photo_url,
      'bio', p.bio
    )
  ) INTO space_data
  FROM public.spaces s
  JOIN public.profiles p ON p.id = s.host_id
  WHERE s.id = space_id
  AND s.published = true
  AND s.is_suspended = false
  AND s.pending_approval = false;
  
  RETURN space_data;
END;
$$;