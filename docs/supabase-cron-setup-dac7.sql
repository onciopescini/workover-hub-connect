-- =====================================================
-- ONDATA 2: FIX 2.5 - DAC7 CRON JOB
-- =====================================================
-- Calculate DAC7 thresholds monthly and generate reports annually
-- Execute this in Supabase SQL Editor

-- Monthly DAC7 threshold check (1st of each month at 02:00)
SELECT cron.schedule(
  'calculate-dac7-thresholds-monthly',
  '0 2 1 * *', -- At 02:00 on day 1 of every month
  $$
  DO $$
  DECLARE
    host_record RECORD;
    current_year INTEGER := EXTRACT(YEAR FROM NOW());
  BEGIN
    FOR host_record IN 
      SELECT DISTINCT p.id as host_id
      FROM public.profiles p
      WHERE p.role = 'host'
      AND p.stripe_connected = TRUE
    LOOP
      PERFORM public.calculate_dac7_thresholds(host_record.host_id, current_year);
    END LOOP;
  END $$;
  $$
);

-- Annual DAC7 report generation (January 15th at 03:00)
SELECT cron.schedule(
  'generate-dac7-reports-annual',
  '0 3 15 1 *', -- At 03:00 on January 15th
  $$
  SELECT net.http_post(
    url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/generate-dac7-reports',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk"}'::jsonb,
    body := jsonb_build_object('year', EXTRACT(YEAR FROM NOW()) - 1)
  ) as request_id;
  $$
);

-- Verify cron jobs
SELECT jobname, schedule, active FROM cron.job 
WHERE jobname LIKE '%dac7%' 
ORDER BY jobname;
