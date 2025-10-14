-- CRON JOB 1: Auto-Mark Bookings Served
SELECT cron.schedule(
  'auto-mark-bookings-served',
  '*/5 * * * *',
  $$
  UPDATE public.bookings
  SET 
    status = 'served',
    service_completed_at = COALESCE(service_completed_at, end_time),
    service_completed_by = COALESCE(service_completed_by, 'system'),
    updated_at = NOW()
  WHERE status = 'confirmed'
    AND booking_date <= CURRENT_DATE
    AND (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Rome') >= 
        ((booking_date + end_time) AT TIME ZONE 'Europe/Rome' + INTERVAL '5 minutes')
    AND EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.booking_id = bookings.id
      AND p.payment_status = 'completed'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.booking_id = bookings.id
      AND p.payment_status IN ('refund_pending', 'refunded', 'disputed')
    );
  $$
);