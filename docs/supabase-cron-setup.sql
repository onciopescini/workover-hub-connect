-- =====================================================
-- WORKOVER CRON JOBS CONFIGURATION
-- =====================================================
-- Execute these SQL commands in Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/khtqwzvrxzsgfhsslwyz/sql/new
-- =====================================================

-- 1. AUTO-MARK BOOKINGS AS SERVED (Every 5 minutes)
-- Automatically marks confirmed bookings as "served" after end_time + 5min
-- =====================================================
SELECT cron.schedule(
  'auto-mark-bookings-served',
  '*/5 * * * *', -- Every 5 minutes
  $$
  UPDATE public.bookings
  SET 
    status = 'served',
    service_completed_at = (booking_date + end_time)::timestamptz,
    service_completed_by = 'system',
    updated_at = NOW()
  WHERE status = 'confirmed'
    AND (booking_date + end_time) <= (NOW() - INTERVAL '5 minutes')
    AND host_issue_reported = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.booking_id = bookings.id
      AND p.payment_status IN ('refund_pending', 'disputed')
    );
  $$
);

-- 2. SCHEDULE HOST PAYOUTS (Every hour)
-- Schedules payouts for hosts 24 hours after service completion
-- FIX: Uses FOR UPDATE SKIP LOCKED to prevent race conditions
-- =====================================================
SELECT cron.schedule(
  'schedule-host-payouts',
  '0 * * * *', -- Every hour at minute 0
  $$
  WITH eligible_bookings AS (
    SELECT b.id
    FROM public.bookings b
    JOIN public.spaces s ON s.id = b.space_id
    JOIN public.profiles prof ON prof.id = s.host_id
    WHERE b.status = 'served'
      AND b.service_completed_at <= (NOW() - INTERVAL '24 hours')
      AND b.payout_scheduled_at IS NULL
      AND prof.stripe_connected = TRUE
      AND prof.kyc_documents_verified = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.booking_id = b.id
          AND p.payment_status IN ('refund_pending', 'disputed')
      )
    FOR UPDATE OF b SKIP LOCKED
  )
  UPDATE public.bookings
  SET 
    payout_scheduled_at = NOW(),
    updated_at = NOW()
  WHERE id IN (SELECT id FROM eligible_bookings);
  $$
);

-- 3. FREEZE BOOKINGS IF STRIPE DISCONNECTED (Every 15 minutes)
-- Freezes bookings if host disconnects Stripe within 48h of booking start
-- =====================================================
SELECT cron.schedule(
  'freeze-bookings-stripe-disconnected',
  '*/15 * * * *', -- Every 15 minutes
  $$
  UPDATE public.bookings
  SET 
    status = 'frozen',
    updated_at = NOW()
  FROM public.spaces s
  JOIN public.profiles p ON p.id = s.host_id
  WHERE bookings.space_id = s.id
    AND bookings.status = 'confirmed'
    AND p.stripe_connected = FALSE
    AND (bookings.booking_date + bookings.start_time) <= (NOW() + INTERVAL '48 hours');
  $$
);

-- 4. SEND HOST INVOICE REMINDERS (Daily at 10:00 AM)
-- Sends reminder emails to hosts who need to issue invoices/credit notes
-- =====================================================
SELECT cron.schedule(
  'send-host-invoice-reminders',
  '0 10 * * *', -- Daily at 10:00 AM
  $$
  SELECT net.http_post(
    url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/send-invoice-reminders',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 5. AUTO-CANCEL FROZEN BOOKINGS (Every hour)
-- Auto-cancels frozen bookings after 24h of Stripe disconnection
-- =====================================================
SELECT cron.schedule(
  'auto-cancel-frozen-bookings',
  '0 */1 * * *', -- Every hour
  $$
  UPDATE public.bookings
  SET 
    status = 'cancelled',
    cancelled_by_host = TRUE,
    cancellation_reason = 'Auto-cancelled: host Stripe disconnected >24h',
    auto_cancel_scheduled_at = NOW(),
    updated_at = NOW()
  WHERE status = 'frozen'
    AND frozen_at < NOW() - INTERVAL '24 hours'
    AND auto_cancel_scheduled_at IS NULL;
  $$
);

-- =====================================================
-- VERIFY CRON JOBS ARE RUNNING
-- =====================================================
-- Run this query to check cron job status:
SELECT * FROM cron.job ORDER BY jobname;

-- To see cron job execution history:
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%bookings%' OR jobname LIKE '%invoice%')
ORDER BY start_time DESC
LIMIT 20;

-- =====================================================
-- UNSCHEDULE/REMOVE CRON JOBS (if needed)
-- =====================================================
-- Uncomment and run these if you need to remove a job:
-- SELECT cron.unschedule('auto-mark-bookings-served');
-- SELECT cron.unschedule('schedule-host-payouts');
-- SELECT cron.unschedule('freeze-bookings-stripe-disconnected');
-- SELECT cron.unschedule('send-host-invoice-reminders');

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Make sure pg_cron and pg_net extensions are enabled in your Supabase project
-- 2. Verify the ANON_KEY in the send-invoice-reminders job matches your project
-- 3. Monitor cron job execution in Supabase Dashboard > Database > Cron Jobs
-- 4. Check edge function logs for any errors in the send-invoice-reminders execution
