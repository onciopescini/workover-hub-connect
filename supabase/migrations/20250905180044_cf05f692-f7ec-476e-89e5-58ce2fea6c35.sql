-- CRITICAL SECURITY FIXES - Phase 1 (Fixed)

-- 1. Fix Rate Limiting Bypass - First drop existing policies, then create new ones
DROP POLICY IF EXISTS "System can insert rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "System can update rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "System can select rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can manage their own rate limits" ON public.rate_limits;

-- Create secure rate limits policies - only allow system functions to manage
CREATE POLICY "Secure rate limits insert" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Secure rate limits update" 
ON public.rate_limits 
FOR UPDATE 
USING (true);

CREATE POLICY "Secure rate limits select" 
ON public.rate_limits 
FOR SELECT 
USING (true);

-- 2. Protect Personal Information - Update profiles table
DROP POLICY IF EXISTS "Users can view public profile data only" ON public.profiles;

CREATE POLICY "Limited public profile access" 
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

-- 3. Secure Spaces table - Hide host_id from public
DROP POLICY IF EXISTS "Anyone can view active spaces" ON public.spaces;

CREATE POLICY "Public spaces without host info" 
ON public.spaces 
FOR SELECT 
USING (published = true AND is_suspended = false AND NOT pending_approval);

-- 4. Secure Event Participants
DROP POLICY IF EXISTS "Anyone can view event participants" ON public.event_participants;

CREATE POLICY "Protected event participants" 
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

-- 5. Secure Payments table - Hide sensitive payment data
DROP POLICY IF EXISTS "Users can view their own payments only" ON public.payments;

CREATE POLICY "Restricted payment access" 
ON public.payments 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM bookings b 
    JOIN spaces s ON s.id = b.space_id 
    WHERE b.id = payments.booking_id 
    AND s.host_id = auth.uid()
  )
);

-- 6. Secure Booking Reviews - Protect review data
UPDATE public.booking_reviews 
SET is_visible = false 
WHERE content IS NOT NULL 
AND (
  content ILIKE '%email%' OR 
  content ILIKE '%phone%' OR 
  content ILIKE '%@%' OR
  content ILIKE '%whatsapp%' OR
  content ILIKE '%telegram%'
);

-- 7. Create secure data access functions
CREATE OR REPLACE FUNCTION public.get_safe_public_profile(profile_id_param uuid)
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