-- =====================================================
-- STEP 2: Creare le RPC functions
-- =====================================================
-- Esegui questo script nel Supabase SQL Editor

-- 1. RPC per recuperare recensioni di uno spazio con dettagli autore
CREATE OR REPLACE FUNCTION public.get_space_reviews(space_id_param uuid)
RETURNS TABLE (
  id uuid,
  booking_id uuid,
  space_id uuid,
  author_id uuid,
  rating integer,
  content text,
  is_visible boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author_first_name text,
  author_last_name text,
  author_profile_photo_url text,
  booking_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.booking_id,
    sr.space_id,
    sr.author_id,
    sr.rating,
    sr.content,
    sr.is_visible,
    sr.created_at,
    sr.updated_at,
    p.first_name AS author_first_name,
    p.last_name AS author_last_name,
    p.profile_photo_url AS author_profile_photo_url,
    b.booking_date
  FROM public.space_reviews sr
  INNER JOIN public.profiles p ON sr.author_id = p.id
  INNER JOIN public.bookings b ON sr.booking_id = b.id
  WHERE sr.space_id = space_id_param
    AND sr.is_visible = true
  ORDER BY sr.created_at DESC;
END;
$$;

-- 2. RPC per calcolare il rating medio ponderato di uno spazio
CREATE OR REPLACE FUNCTION public.calculate_space_weighted_rating(space_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  weighted_rating numeric;
BEGIN
  SELECT COALESCE(AVG(rating)::numeric, 0)
  INTO weighted_rating
  FROM public.space_reviews
  WHERE space_id = space_id_param
    AND is_visible = true;
  
  RETURN ROUND(weighted_rating, 2);
END;
$$;

-- Permessi di esecuzione per le RPC
GRANT EXECUTE ON FUNCTION public.get_space_reviews(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_space_weighted_rating(uuid) TO anon, authenticated;

-- Verifica RPC create
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_space_reviews', 'calculate_space_weighted_rating')
ORDER BY routine_name;
