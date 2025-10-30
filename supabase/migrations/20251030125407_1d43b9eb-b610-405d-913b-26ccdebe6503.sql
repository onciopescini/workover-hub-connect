-- =====================================================
-- STEP 1: BACKFILL booking_reviews into space_reviews
-- =====================================================

INSERT INTO public.space_reviews (
  id, 
  booking_id, 
  space_id, 
  author_id, 
  rating, 
  content, 
  is_visible, 
  created_at, 
  updated_at
)
SELECT
  gen_random_uuid(),
  br.booking_id,
  b.space_id,
  br.author_id,
  br.rating,
  br.content,
  CASE 
    WHEN br.is_visible = TRUE THEN TRUE
    WHEN br.created_at <= NOW() - INTERVAL '14 days' THEN TRUE 
    ELSE FALSE 
  END,
  br.created_at,
  COALESCE(br.updated_at, br.created_at)
FROM public.booking_reviews br
JOIN public.bookings b ON b.id = br.booking_id
WHERE br.author_id = b.user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.space_reviews sr
    WHERE sr.booking_id = br.booking_id
      AND sr.author_id = br.author_id
  );

-- =====================================================
-- STEP 2: FIX IMMEDIATO - Visibilità temporale
-- =====================================================

-- Disabilita solo i trigger USER (non quelli di sistema)
ALTER TABLE public.booking_reviews DISABLE TRIGGER USER;

UPDATE public.booking_reviews
SET is_visible = TRUE, updated_at = NOW()
WHERE is_visible = FALSE 
  AND created_at <= NOW() - INTERVAL '14 days';

-- Riabilita i trigger USER
ALTER TABLE public.booking_reviews ENABLE TRIGGER USER;

-- Fix space_reviews
UPDATE public.space_reviews
SET is_visible = TRUE, updated_at = NOW()
WHERE is_visible = FALSE 
  AND created_at <= NOW() - INTERVAL '14 days';

-- =====================================================
-- STEP 3: TRIGGER space_reviews
-- =====================================================

CREATE OR REPLACE FUNCTION public.space_reviews_enforce_temporal_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_at <= NOW() - INTERVAL '14 days' THEN
    NEW.is_visible := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_space_reviews_temporal_visibility ON public.space_reviews;

CREATE TRIGGER trigger_space_reviews_temporal_visibility
  BEFORE INSERT OR UPDATE ON public.space_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.space_reviews_enforce_temporal_visibility();

-- =====================================================
-- STEP 4: TRIGGER booking_reviews
-- =====================================================

CREATE OR REPLACE FUNCTION public.booking_reviews_enforce_temporal_visibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_at <= NOW() - INTERVAL '14 days' THEN
    NEW.is_visible := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_booking_reviews_temporal_visibility ON public.booking_reviews;

CREATE TRIGGER trigger_booking_reviews_temporal_visibility
  BEFORE INSERT OR UPDATE ON public.booking_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.booking_reviews_enforce_temporal_visibility();