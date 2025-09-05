-- 1) Restrict public access to booking_reviews by updating SELECT policy
-- Remove public visibility via is_visible=true and allow only authors, targets, and hosts (for their spaces) to view
ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own booking reviews" ON public.booking_reviews;

CREATE POLICY "Users can view their own booking reviews"
ON public.booking_reviews
FOR SELECT
USING (
  auth.uid() = author_id
  OR auth.uid() = target_id
  OR (
    EXISTS (
      SELECT 1 
      FROM public.bookings b
      JOIN public.spaces s ON s.id = b.space_id
      WHERE b.id = booking_reviews.booking_id
      AND s.host_id = auth.uid()
    )
    AND is_visible = true
  )
);

-- 2) Sanitize public RPC for space reviews: remove author_id from returned columns
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
SET search_path TO 'public'
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

-- 3) New sanitized RPC to fetch a user's public reviews without exposing internal IDs
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
SET search_path TO 'public'
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