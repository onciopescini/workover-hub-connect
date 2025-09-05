-- Fix function search path security warnings for the new functions
-- Set proper search paths to avoid function search path issues

CREATE OR REPLACE FUNCTION public.get_space_reviews_with_details(space_id_param uuid)
RETURNS TABLE(
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
STABLE
SET search_path = public
AS $function$
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
  JOIN public.bookings b ON b.id = br.booking_id
  JOIN public.profiles p ON p.id = br.author_id
  WHERE b.space_id = space_id_param
  AND br.is_visible = true
  ORDER BY br.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_public_reviews(target_id_param uuid)
RETURNS TABLE(
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
STABLE
SET search_path = public
AS $function$
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
  JOIN public.bookings b ON b.id = br.booking_id
  JOIN public.profiles p ON p.id = br.author_id
  WHERE br.target_id = target_id_param
  AND br.is_visible = true
  ORDER BY br.created_at DESC;
END;
$function$;