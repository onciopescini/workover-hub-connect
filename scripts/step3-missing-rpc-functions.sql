-- =====================================================
-- STEP 3: Creare la RPC function mancante
-- =====================================================
-- Esegui questo script nel Supabase SQL Editor

-- RPC per verificare lo stato delle recensioni di uno spazio per un booking specifico
CREATE OR REPLACE FUNCTION public.get_space_review_status(
  booking_id_param uuid,
  user_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  review_record record;
  result json;
  days_until_visible integer;
BEGIN
  -- Cerca la recensione esistente
  SELECT 
    id,
    is_visible,
    created_at
  INTO review_record
  FROM public.space_reviews
  WHERE booking_id = booking_id_param
    AND author_id = user_id_param;

  -- Se non esiste recensione
  IF NOT FOUND THEN
    result := json_build_object(
      'canWriteReview', true,
      'hasWrittenReview', false,
      'isVisible', false,
      'daysUntilVisible', 0
    );
  ELSE
    -- Calcola giorni mancanti alla visibilità (14 giorni dalla creazione)
    days_until_visible := GREATEST(
      0,
      14 - EXTRACT(DAY FROM (now() - review_record.created_at))::integer
    );

    result := json_build_object(
      'canWriteReview', false,
      'hasWrittenReview', true,
      'isVisible', review_record.is_visible,
      'daysUntilVisible', days_until_visible
    );
  END IF;

  RETURN result;
END;
$$;

-- Permessi di esecuzione
GRANT EXECUTE ON FUNCTION public.get_space_review_status(uuid, uuid) TO anon, authenticated;

-- Verifica funzione creata
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_space_review_status'
ORDER BY routine_name;
