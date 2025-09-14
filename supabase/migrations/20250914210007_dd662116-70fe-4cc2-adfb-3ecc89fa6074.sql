-- Fix security issue: Prevent public access to host_id in spaces table
-- Create secure public access functions that don't expose host identifiers

-- First, drop existing overly permissive policies on spaces table
DROP POLICY IF EXISTS "Anyone can view published spaces" ON public.spaces;
DROP POLICY IF EXISTS "Public can view published spaces" ON public.spaces;

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS public.get_public_spaces();
DROP FUNCTION IF EXISTS public.get_space_with_host_info(uuid);

-- Create secure RLS policies for spaces table
CREATE POLICY "Hosts can manage their own spaces" 
ON public.spaces 
FOR ALL 
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Admins can manage all spaces" 
ON public.spaces 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create secure function for public space listings (without host_id exposure)
CREATE OR REPLACE FUNCTION public.get_public_spaces()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  subcategory text,
  photos text[],
  price_per_day numeric,
  address text,
  latitude numeric,
  longitude numeric,
  max_capacity integer,
  workspace_features text[],
  amenities text[],
  work_environment text,
  seating_type text,
  ideal_guest text,
  confirmation_type text,
  published boolean,
  created_at timestamp with time zone,
  host_first_name text,
  host_last_name text,
  host_profile_photo text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.category,
    s.subcategory,
    s.photos,
    s.price_per_day,
    s.address,
    s.latitude,
    s.longitude,
    s.max_capacity,
    s.workspace_features,
    s.amenities,
    s.work_environment,
    s.seating_type,
    s.ideal_guest,
    s.confirmation_type,
    s.published,
    s.created_at,
    p.first_name as host_first_name,
    p.last_name as host_last_name,
    p.profile_photo_url as host_profile_photo
  FROM public.spaces s
  LEFT JOIN public.profiles p ON p.id = s.host_id
  WHERE s.published = true 
    AND s.is_suspended = false
    AND p.is_suspended = false;
END;
$$;

-- Create secure function for single space details (without host_id exposure)
CREATE OR REPLACE FUNCTION public.get_space_with_host_info(space_id_param uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  subcategory text,
  photos text[],
  price_per_day numeric,
  address text,
  latitude numeric,
  longitude numeric,
  max_capacity integer,
  workspace_features text[],
  amenities text[],
  work_environment text,
  seating_type text,
  ideal_guest text,
  confirmation_type text,
  published boolean,
  created_at timestamp with time zone,
  availability jsonb,
  host_first_name text,
  host_last_name text,
  host_profile_photo text,
  host_bio text,
  host_networking_enabled boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.category,
    s.subcategory,
    s.photos,
    s.price_per_day,
    s.address,
    s.latitude,
    s.longitude,
    s.max_capacity,
    s.workspace_features,
    s.amenities,
    s.work_environment,
    s.seating_type,
    s.ideal_guest,
    s.confirmation_type,
    s.published,
    s.created_at,
    s.availability,
    p.first_name as host_first_name,
    p.last_name as host_last_name,
    p.profile_photo_url as host_profile_photo,
    p.bio as host_bio,
    p.networking_enabled as host_networking_enabled
  FROM public.spaces s
  LEFT JOIN public.profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param
    AND s.published = true 
    AND s.is_suspended = false
    AND p.is_suspended = false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_spaces() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_space_with_host_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_spaces() TO anon;
GRANT EXECUTE ON FUNCTION public.get_space_with_host_info(uuid) TO anon;