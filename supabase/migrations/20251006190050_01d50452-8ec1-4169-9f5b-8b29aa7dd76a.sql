-- Fase 3: Data Integrity Fix per Bookings senza Pagamento
-- Questo script identifica e corregge prenotazioni confirmed senza payment associato

-- Step 1: Identificare prenotazioni problematiche
DO $$
DECLARE
  problematic_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO problematic_count
  FROM bookings b
  WHERE b.status = 'confirmed'
    AND NOT EXISTS (
      SELECT 1 FROM payments p 
      WHERE p.booking_id = b.id 
      AND p.payment_status IN ('completed', 'pending')
    );
  
  RAISE NOTICE 'Trovate % prenotazioni confirmed senza payment', problematic_count;
END $$;

-- Step 2: Reset bookings problematici a 'pending' per forzare nuovo pagamento
UPDATE bookings 
SET 
  status = 'pending',
  updated_at = now()
WHERE status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.booking_id = bookings.id 
    AND p.payment_status IN ('completed', 'pending')
  );

-- Step 3: Trigger per prevenire booking confirmed senza payment (PREVENTIVO)
CREATE OR REPLACE FUNCTION validate_booking_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo quando si passa a 'confirmed'
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Verifica esistenza payment
    IF NOT EXISTS (
      SELECT 1 FROM payments 
      WHERE booking_id = NEW.id 
      AND payment_status IN ('completed', 'pending')
    ) THEN
      RAISE EXCEPTION 'Impossibile confermare prenotazione senza pagamento associato. Booking ID: %', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea trigger (se non esiste già)
DROP TRIGGER IF EXISTS check_booking_payment ON bookings;
CREATE TRIGGER check_booking_payment
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION validate_booking_payment();

-- Step 4: Funzione di integrità per controlli periodici
CREATE OR REPLACE FUNCTION check_payment_integrity()
RETURNS TABLE(
  booking_id UUID,
  status TEXT,
  booking_date DATE,
  space_title TEXT,
  issue TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    b.status::TEXT,
    b.booking_date,
    s.title as space_title,
    'Booking confirmed without payment' as issue
  FROM bookings b
  JOIN spaces s ON s.id = b.space_id
  WHERE b.status = 'confirmed'
    AND NOT EXISTS (
      SELECT 1 FROM payments p 
      WHERE p.booking_id = b.id 
      AND p.payment_status IN ('completed', 'pending')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;