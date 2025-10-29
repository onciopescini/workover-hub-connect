-- =====================================================
-- STEP 1: Creare i trigger mancanti
-- =====================================================
-- Esegui questo script nel Supabase SQL Editor

-- 1. Trigger per visibilità reciproca su booking_reviews
DROP TRIGGER IF EXISTS trigger_check_booking_review_visibility ON public.booking_reviews;
CREATE TRIGGER trigger_check_booking_review_visibility
  BEFORE INSERT OR UPDATE ON public.booking_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_mutual_review_visibility();

-- 2. Trigger per updated_at su space_reviews
DROP TRIGGER IF EXISTS trigger_update_space_reviews_updated_at ON public.space_reviews;
CREATE TRIGGER trigger_update_space_reviews_updated_at
  BEFORE UPDATE ON public.space_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 3. Trigger per visibilità automatica dopo 14 giorni su space_reviews
DROP TRIGGER IF EXISTS trigger_space_reviews_enforce_visibility ON public.space_reviews;
CREATE TRIGGER trigger_space_reviews_enforce_visibility
  BEFORE INSERT OR UPDATE ON public.space_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.space_reviews_enforce_visibility();

-- Verifica trigger creati
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_check_booking_review_visibility',
    'trigger_update_space_reviews_updated_at',
    'trigger_space_reviews_enforce_visibility'
  )
ORDER BY event_object_table, trigger_name;
