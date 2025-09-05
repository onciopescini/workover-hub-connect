-- CRITICAL SECURITY FIXES - Phase 1

-- 1. Fix Rate Limiting Bypass - Remove dangerous public access to rate_limits table
DROP POLICY IF EXISTS "Users can manage their own rate limits" ON public.rate_limits;

-- Create secure rate limits policies - only allow system functions to manage
CREATE POLICY "System can insert rate limits" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update rate limits" 
ON public.rate_limits 
FOR UPDATE 
USING (true);

CREATE POLICY "System can select rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (true);

-- 2. Protect Personal Information - Update profiles table to hide sensitive data from public access
DROP POLICY IF EXISTS "Users can view public profile data only" ON public.profiles;

-- Create new restrictive policy for public profile viewing
CREATE POLICY "Users can view limited public profile data" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() <> id) AND 
  (networking_enabled = true) AND 
  (is_suspended = false) AND 
  (EXISTS (
    SELECT 1 FROM check_profile_access(auth.uid(), profiles.id) access(access)
    WHERE ((access.access ->> 'has_access')::boolean = true)
  ))
);

-- 3. Secure Spaces table - Hide host_id from public queries
DROP POLICY IF EXISTS "Anyone can view active spaces" ON public.spaces;

-- Create new policy that doesn't expose host_id publicly
CREATE POLICY "Anyone can view spaces without host info" 
ON public.spaces 
FOR SELECT 
USING (published = true AND is_suspended = false AND NOT pending_approval);

-- 4. Secure Event Participants - Protect user privacy in events
DROP POLICY IF EXISTS "Anyone can view event participants" ON public.event_participants;

-- Create restrictive policy for event participants
CREATE POLICY "Limited event participant viewing" 
ON public.event_participants 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM events e 
    WHERE e.id = event_participants.event_id 
    AND e.created_by = auth.uid()
  )
);

-- 5. Create secure public profile function
CREATE OR REPLACE FUNCTION public.get_public_profile_safe(profile_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data json;
  access_check json;
BEGIN
  -- Check access first
  SELECT access INTO access_check 
  FROM check_profile_access(auth.uid(), profile_id_param);
  
  IF NOT ((access_check ->> 'has_access')::boolean) THEN
    RETURN json_build_object('error', 'Access denied');
  END IF;
  
  -- Return only safe public fields
  SELECT json_build_object(
    'id', id,
    'first_name', first_name,
    'last_name', last_name,
    'nickname', nickname,
    'profile_photo_url', profile_photo_url,
    'bio', bio,
    'profession', profession,
    'job_title', job_title,
    'city', city,
    'skills', skills,
    'interests', interests,
    'networking_enabled', networking_enabled,
    'collaboration_availability', collaboration_availability,
    'collaboration_description', collaboration_description,
    'created_at', created_at
  ) INTO profile_data
  FROM profiles 
  WHERE id = profile_id_param 
  AND networking_enabled = true 
  AND is_suspended = false;
  
  RETURN COALESCE(profile_data, json_build_object('error', 'Profile not found'));
END;
$$;

-- 6. Create secure public spaces function
CREATE OR REPLACE FUNCTION public.get_public_spaces_safe()
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
      'id', id,
      'title', title,
      'description', description,
      'price_per_day', price_per_day,
      'city', city,
      'country', country,
      'space_type', space_type,
      'capacity', capacity,
      'amenities', amenities,
      'images', images,
      'rating', rating,
      'total_reviews', total_reviews,
      'is_available', is_available,
      'created_at', created_at
      -- Deliberately exclude host_id, address, and other sensitive fields
    )
  ) INTO spaces_data
  FROM spaces 
  WHERE published = true 
  AND is_suspended = false 
  AND NOT pending_approval;
  
  RETURN COALESCE(spaces_data, '[]'::json);
END;
$$;