-- CRON JOB 3: Stage 3 - Auto-cancel frozen bookings
SELECT cron.schedule(
  'cancel-frozen-bookings-stripe-disconnected',
  '0 */6 * * *',
  $$
  WITH cancelled_bookings AS (
    UPDATE public.bookings
    SET 
      status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by_host = TRUE,
      cancellation_reason = 'Host Stripe disconnected - auto-cancelled by system',
      cancellation_fee = 0,
      updated_at = NOW()
    WHERE status = 'frozen'
      AND frozen_reason = 'host_stripe_disconnected'
      AND auto_cancel_scheduled_at <= NOW()
      AND space_id IN (
        SELECT s.id FROM public.spaces s
        JOIN public.profiles p ON p.id = s.host_id
        WHERE p.stripe_connected = FALSE
      )
    RETURNING id
  )
  UPDATE public.payments
  SET payment_status = 'refund_pending'
  WHERE booking_id IN (SELECT id FROM cancelled_bookings)
    AND payment_status = 'completed';
  $$
);