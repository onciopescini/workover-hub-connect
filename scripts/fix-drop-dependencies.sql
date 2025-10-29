-- =====================================================
-- FIX: Eliminare trigger prima della funzione
-- =====================================================
-- Questo script risolve l'errore di dipendenza quando si tenta
-- di eliminare una funzione ancora usata da trigger

-- STEP 1: Elimina tutti i trigger dipendenti
DO $$
BEGIN
  -- Elimina trigger se esiste
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_check_booking_review_visibility'
    AND event_object_table = 'booking_reviews'
  ) THEN
    DROP TRIGGER trigger_check_booking_review_visibility ON public.booking_reviews;
    RAISE NOTICE 'Trigger trigger_check_booking_review_visibility eliminato';
  END IF;
END $$;

-- STEP 2: Ora elimina la funzione con CASCADE (elimina automaticamente tutti i trigger rimasti)
DROP FUNCTION IF EXISTS public.check_mutual_review_visibility() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Verifica che i trigger siano stati eliminati
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (event_object_table = 'booking_reviews' OR event_object_table = 'space_reviews')
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- IMPORTANTE: Dopo questo script, riesegui lo script
-- di migrazione principale che stavi eseguendo
-- =====================================================
