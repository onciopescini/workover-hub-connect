-- CRON JOB 3: Stage 2 - Freeze bookings
SELECT cron.schedule(
  'freeze-bookings-stripe-disconnected',
  '0 */6 * * *',
  $$
  WITH frozen_bookings AS (
    UPDATE public.bookings b
    SET 
      status = 'frozen',
      frozen_at = NOW(),
      frozen_reason = 'host_stripe_disconnected',
      auto_cancel_scheduled_at = NOW() + INTERVAL '24 hours',
      updated_at = NOW()
    FROM public.spaces s
    JOIN public.profiles p ON p.id = s.host_id
    WHERE b.space_id = s.id
      AND b.status = 'confirmed'
      AND p.stripe_connected = FALSE
      AND ((b.booking_date + b.start_time) AT TIME ZONE 'Europe/Rome') BETWEEN 
          (NOW() AT TIME ZONE 'Europe/Rome' + INTERVAL '24 hours') 
          AND (NOW() AT TIME ZONE 'Europe/Rome' + INTERVAL '48 hours')
      AND b.frozen_at IS NULL
    RETURNING b.id, b.user_id, s.title
  )
  INSERT INTO public.user_notifications (user_id, type, title, content, metadata)
  SELECT 
    user_id,
    'booking',
    'Prenotazione congelata',
    'La prenotazione per "' || title || '" è stata congelata. Sarà cancellata con rimborso completo se l''host non riconnette Stripe entro 24h.',
    jsonb_build_object('booking_id', id, 'space_title', title)
  FROM frozen_bookings;
  $$
);