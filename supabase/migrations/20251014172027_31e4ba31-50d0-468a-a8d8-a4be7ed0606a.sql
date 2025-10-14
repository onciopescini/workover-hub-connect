-- =====================================================
-- FASE 2: DAC7 AUTOMATION - Real-time Monitoring
-- =====================================================

-- 1. Create real-time DAC7 threshold monitoring function
CREATE OR REPLACE FUNCTION public.check_dac7_threshold()
RETURNS TRIGGER AS $$
DECLARE
  host_total NUMERIC;
  host_tx_count INTEGER;
  current_host_id UUID;
BEGIN
  -- Get host_id from the booking
  SELECT s.host_id INTO current_host_id
  FROM bookings b
  JOIN spaces s ON s.id = b.space_id
  WHERE b.id = NEW.booking_id;
  
  -- Skip if host not found
  IF current_host_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate annual totals for this host
  SELECT 
    COALESCE(SUM(p.host_amount), 0),
    COUNT(*)
  INTO host_total, host_tx_count
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  JOIN spaces s ON s.id = b.space_id
  WHERE s.host_id = current_host_id
    AND EXTRACT(YEAR FROM p.created_at) = EXTRACT(YEAR FROM NOW())
    AND p.payment_status = 'completed';
  
  -- Check if threshold reached AND not yet notified
  IF host_total >= 2000 AND host_tx_count >= 25 THEN
    UPDATE profiles
    SET 
      dac7_threshold_notified = TRUE,
      updated_at = NOW()
    WHERE id = current_host_id
      AND dac7_threshold_notified = FALSE;
    
    -- Only insert notification if update actually changed a row
    IF FOUND THEN
      INSERT INTO user_notifications (user_id, type, title, content, metadata)
      VALUES (
        current_host_id,
        'dac7_threshold',
        '⚠️ Soglia DAC7 Superata',
        'Hai superato le soglie DAC7 (€2.000 e 25 transazioni). I tuoi dati saranno comunicati all''Agenzia delle Entrate entro il 31 gennaio del prossimo anno.',
        jsonb_build_object(
          'total_income', host_total,
          'total_transactions', host_tx_count,
          'year', EXTRACT(YEAR FROM NOW())
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create trigger on payments table
DROP TRIGGER IF EXISTS payment_dac7_check ON payments;

CREATE TRIGGER payment_dac7_check
AFTER INSERT OR UPDATE OF payment_status ON payments
FOR EACH ROW
WHEN (NEW.payment_status = 'completed')
EXECUTE FUNCTION check_dac7_threshold();

-- 3. Schedule annual reset of DAC7 notifications (January 1st at 00:00)
SELECT cron.schedule(
  'reset-dac7-notifications',
  '0 0 1 1 *',
  $$
  UPDATE profiles
  SET 
    dac7_threshold_notified = FALSE,
    updated_at = NOW()
  WHERE dac7_threshold_notified = TRUE;
  $$
);

-- 4. Schedule annual DAC7 report generation (January 15th at 02:00)
SELECT cron.schedule(
  'annual-dac7-report-generation',
  '0 2 15 1 *',
  $$
  SELECT net.http_post(
    url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/generate-dac7-report',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk", "Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('year', EXTRACT(YEAR FROM NOW()) - 1)
  ) as request_id;
  $$
);