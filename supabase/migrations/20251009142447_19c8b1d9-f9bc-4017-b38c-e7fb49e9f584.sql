-- Enable pg_cron and pg_net extensions for scheduled edge functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule booking-expiry-check to run every 5 minutes
SELECT cron.schedule(
  'booking-expiry-check-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/booking-expiry-check',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Schedule booking-reminders to run every 5 minutes
SELECT cron.schedule(
  'booking-reminders-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/booking-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);