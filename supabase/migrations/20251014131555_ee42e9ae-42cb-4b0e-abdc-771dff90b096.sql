-- CRON JOB 2: Schedule Host Payouts
SELECT cron.schedule(
  'schedule-host-payouts',
  '0 * * * *',
  $$
  WITH scheduled_payouts AS (
    UPDATE public.bookings b
    SET 
      payout_scheduled_at = NOW(),
      updated_at = NOW()
    FROM public.spaces s
    JOIN public.profiles prof ON prof.id = s.host_id
    JOIN public.payments p ON p.booking_id = b.id
    WHERE b.id = bookings.id
      AND b.status = 'served'
      AND b.payout_scheduled_at IS NULL
      AND b.payout_completed_at IS NULL
      AND NOW() >= b.service_completed_at + INTERVAL '24 hours'
      AND prof.stripe_connected = TRUE
      AND p.payment_status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p2
        WHERE p2.booking_id = b.id
        AND p2.payment_status IN ('refund_pending', 'refunded', 'disputed')
      )
    RETURNING b.id
  )
  SELECT net.http_post(
    url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/execute-payout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk'
    ),
    body := '{}'::jsonb
  )
  WHERE EXISTS (SELECT 1 FROM scheduled_payouts);
  $$
);