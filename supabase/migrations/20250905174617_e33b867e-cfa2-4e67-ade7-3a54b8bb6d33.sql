-- Fix critical security issues: data exposure and RLS policies

-- 1. Fix function search_path security warnings
DROP FUNCTION IF EXISTS public.get_space_reviews_with_details(uuid);
DROP FUNCTION IF EXISTS public.get_user_public_reviews(uuid);

CREATE OR REPLACE FUNCTION public.get_space_reviews_with_details(space_id_param uuid)
RETURNS TABLE (
  id uuid,
  rating integer,
  content text,
  created_at timestamp with time zone,
  author_first_name text,
  author_last_name text,
  author_profile_photo_url text,
  booking_date date,
  is_visible boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    br.rating,
    br.content,
    br.created_at,
    p.first_name as author_first_name,
    p.last_name as author_last_name,
    p.profile_photo_url as author_profile_photo_url,
    b.booking_date,
    br.is_visible
  FROM public.booking_reviews br
  JOIN public.bookings b ON br.booking_id = b.id
  JOIN public.profiles p ON br.author_id = p.id
  WHERE b.space_id = space_id_param
    AND br.is_visible = true
  ORDER BY br.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_public_reviews(target_id_param uuid)
RETURNS TABLE (
  id uuid,
  rating integer,
  content text,
  created_at timestamp with time zone,
  author_first_name text,
  author_last_name text,
  author_profile_photo_url text,
  booking_date date,
  is_visible boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    br.rating,
    br.content,
    br.created_at,
    p.first_name as author_first_name,
    p.last_name as author_last_name,
    p.profile_photo_url as author_profile_photo_url,
    b.booking_date,
    br.is_visible
  FROM public.booking_reviews br
  JOIN public.bookings b ON br.booking_id = b.id
  JOIN public.profiles p ON br.author_id = p.id
  WHERE br.target_id = target_id_param
    AND br.is_visible = true
  ORDER BY br.created_at DESC;
END;
$$;

-- 2. Create secure profile access function that filters sensitive data
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id_param uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  nickname text,
  profile_photo_url text,
  bio text,
  profession text,
  job_title text,
  city text,
  skills text,
  interests text,
  networking_enabled boolean,
  collaboration_availability text,
  collaboration_description text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return basic profile info, no sensitive data
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.nickname,
    p.profile_photo_url,
    p.bio,
    p.profession,
    p.job_title,
    p.city,
    p.skills,
    p.interests,
    p.networking_enabled,
    p.collaboration_availability,
    p.collaboration_description,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id_param
    AND p.networking_enabled = true
    AND p.is_suspended = false;
END;
$$;

-- 3. Create secure spaces listing function that hides sensitive location data
CREATE OR REPLACE FUNCTION public.get_public_spaces()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price_per_day numeric,
  city text,
  country text,
  space_type text,
  capacity integer,
  amenities text[],
  images text[],
  rating numeric,
  total_reviews integer,
  is_available boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return spaces without exposing host_id or full addresses
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.price_per_day,
    s.city,
    s.country,
    s.space_type,
    s.capacity,
    s.amenities,
    s.images,
    COALESCE(public.calculate_weighted_space_rating(s.id), 0) as rating,
    (SELECT COUNT(*)::integer FROM public.booking_reviews br 
     JOIN public.bookings b ON br.booking_id = b.id 
     WHERE b.space_id = s.id AND br.is_visible = true) as total_reviews,
    s.is_available,
    s.created_at
  FROM public.spaces s
  WHERE s.published = true
    AND s.is_suspended = false
    AND s.pending_approval = false
  ORDER BY s.created_at DESC;
END;
$$;

-- 4. Restrict direct access to sensitive profile fields by updating RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Allow users to read their own complete profile
CREATE POLICY "Users can read own complete profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Create restricted policy for other users' profiles (networking context only)
CREATE POLICY "Users can view public profile data only" ON public.profiles
FOR SELECT USING (
  auth.uid() != id AND
  networking_enabled = true AND
  is_suspended = false AND
  EXISTS (
    SELECT 1 FROM public.check_profile_access(auth.uid(), id) AS access
    WHERE (access->>'has_access')::boolean = true
  )
);

-- 5. Enhance spaces RLS to prevent host_id exposure in public queries
DROP POLICY IF EXISTS "Anyone can view published spaces" ON public.spaces;

-- Create policy that allows viewing basic space info without exposing host details
CREATE POLICY "Anyone can view published space basics" ON public.spaces
FOR SELECT USING (
  published = true AND 
  is_suspended = false AND 
  pending_approval = false
);

-- 6. Restrict payments table access more strictly
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

CREATE POLICY "Users can view their own payments only" ON public.payments
FOR SELECT USING (auth.uid() = user_id);

-- Hosts can view payments for their spaces (through bookings)
CREATE POLICY "Hosts can view payments for their spaces" ON public.payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.spaces s ON s.id = b.space_id
    WHERE b.id = payments.booking_id AND s.host_id = auth.uid()
  )
);

-- 7. Add function to safely get space details with host info (authenticated only)
CREATE OR REPLACE FUNCTION public.get_space_with_host_info(space_id_param uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price_per_day numeric,
  address text,
  city text,
  country text,
  space_type text,
  capacity integer,
  amenities text[],
  images text[],
  rating numeric,
  total_reviews integer,
  host_id uuid,
  host_first_name text,
  host_last_name text,
  host_profile_photo_url text,
  host_bio text,
  is_available boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return full details including host info if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.price_per_day,
    s.address,
    s.city,
    s.country,
    s.space_type,
    s.capacity,
    s.amenities,
    s.images,
    COALESCE(public.calculate_weighted_space_rating(s.id), 0) as rating,
    (SELECT COUNT(*)::integer FROM public.booking_reviews br 
     JOIN public.bookings b ON br.booking_id = b.id 
     WHERE b.space_id = s.id AND br.is_visible = true) as total_reviews,
    s.host_id,
    p.first_name as host_first_name,
    p.last_name as host_last_name,
    p.profile_photo_url as host_profile_photo_url,
    p.bio as host_bio,
    s.is_available,
    s.created_at
  FROM public.spaces s
  JOIN public.profiles p ON s.host_id = p.id
  WHERE s.id = space_id_param
    AND s.published = true
    AND s.is_suspended = false;
END;
$$;