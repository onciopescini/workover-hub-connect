-- =====================================================
-- FIX: Eliminare trigger prima della funzione
-- =====================================================
-- Questo script risolve l'errore di dipendenza quando si tenta
-- di eliminare una funzione ancora usata da trigger

-- Elimina prima il trigger se esiste
DROP TRIGGER IF EXISTS trigger_check_booking_review_visibility ON public.booking_reviews CASCADE;

-- Elimina la funzione con CASCADE per rimuovere tutte le dipendenze
DROP FUNCTION IF EXISTS public.check_mutual_review_visibility() CASCADE;

-- Se ci sono altri trigger o funzioni con dipendenze simili, eliminali
DROP TRIGGER IF EXISTS update_booking_reviews_updated_at ON public.booking_reviews CASCADE;
DROP TRIGGER IF EXISTS update_space_reviews_updated_at ON public.space_reviews CASCADE;

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
