-- =====================================================
-- STEP 4: Creare le RPC functions mancanti per space_reviews
-- =====================================================
-- Esegui questo script nel Supabase SQL Editor

-- =====================================================
-- 1. RPC per ottenere tutte le recensioni di uno spazio
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_space_reviews(space_id_param uuid)
RETURNS TABLE(
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
    p.first_name as author_first_name,
    p.last_name as author_last_name,
    p.profile_photo_url as author_profile_photo_url,
    b.booking_date as booking_date
  FROM public.space_reviews sr
  INNER JOIN public.profiles p ON sr.author_id = p.id
  INNER JOIN public.bookings b ON sr.booking_id = b.id
  WHERE sr.space_id = space_id_param
    AND sr.is_visible = true
  ORDER BY sr.created_at DESC;
END;
$$;

-- Permessi di esecuzione
GRANT EXECUTE ON FUNCTION public.get_space_reviews(uuid) TO anon, authenticated;

-- =====================================================
-- 2. RPC per calcolare il rating medio ponderato di uno spazio
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_space_weighted_rating(space_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  weighted_rating numeric;
BEGIN
  -- Calcola la media delle stelle solo per recensioni visibili
  SELECT COALESCE(AVG(rating)::numeric, 0.0)
  INTO weighted_rating
  FROM public.space_reviews
  WHERE space_id = space_id_param
    AND is_visible = true;
  
  -- Arrotonda a 1 decimale
  RETURN ROUND(weighted_rating, 1);
END;
$$;

-- Permessi di esecuzione
GRANT EXECUTE ON FUNCTION public.calculate_space_weighted_rating(uuid) TO anon, authenticated;

-- =====================================================
-- 3. Verifica che get_space_review_status esista
-- =====================================================
-- Se non esiste (non eseguito step3), ricreala
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'get_space_review_status'
  ) THEN
    -- Crea la funzione
    EXECUTE '
      CREATE FUNCTION public.get_space_review_status(
        booking_id_param uuid,
        user_id_param uuid
      )
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $func$
      DECLARE
        review_record record;
        result json;
        days_until_visible integer;
      BEGIN
        SELECT 
          id,
          is_visible,
          created_at
        INTO review_record
        FROM public.space_reviews
        WHERE booking_id = booking_id_param
          AND author_id = user_id_param;

        IF NOT FOUND THEN
          result := json_build_object(
            ''canWriteReview'', true,
            ''hasWrittenReview'', false,
            ''isVisible'', false,
            ''daysUntilVisible'', 0
          );
        ELSE
          days_until_visible := GREATEST(
            0,
            14 - EXTRACT(DAY FROM (now() - review_record.created_at))::integer
          );

          result := json_build_object(
            ''canWriteReview'', false,
            ''hasWrittenReview'', true,
            ''isVisible'', review_record.is_visible,
            ''daysUntilVisible'', days_until_visible
          );
        END IF;

        RETURN result;
      END;
      $func$;
    ';
    
    -- Permessi
    GRANT EXECUTE ON FUNCTION public.get_space_review_status(uuid, uuid) TO anon, authenticated;
  END IF;
END $$;

-- =====================================================
-- VERIFICA FINALE
-- =====================================================
-- Controlla che tutte le funzioni siano state create
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  CASE 
    WHEN routine_name IN ('get_space_reviews', 'calculate_space_weighted_rating', 'get_space_review_status')
    THEN '✅ CREATA'
    ELSE '❌ MANCANTE'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_space_reviews', 'calculate_space_weighted_rating', 'get_space_review_status')
ORDER BY routine_name;

-- =====================================================
-- TEST RAPIDO (opzionale)
-- =====================================================
-- Decommentare per testare con UUID di test:

-- Test 1: get_space_reviews
-- SELECT * FROM public.get_space_reviews('space-uuid-here');

-- Test 2: calculate_space_weighted_rating
-- SELECT public.calculate_space_weighted_rating('space-uuid-here');

-- Test 3: get_space_review_status
-- SELECT public.get_space_review_status('booking-uuid-here', 'user-uuid-here');
