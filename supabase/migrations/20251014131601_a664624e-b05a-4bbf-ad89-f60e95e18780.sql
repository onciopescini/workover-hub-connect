-- CRON JOB 3: Freeze/Cancel Bookings (Stripe Disconnected) - Stage 1: Warnings
SELECT cron.schedule(
  'freeze-warnings-stripe-disconnected',
  '0 */6 * * *',
  $$
  INSERT INTO public.user_notifications (user_id, type, title, content, metadata)
  SELECT 
    b.user_id,
    'booking',
    'Attenzione: prenotazione a rischio',
    'La prenotazione per "' || s.title || '" potrebbe essere cancellata se l''host non riconnette Stripe entro 48h.',
    jsonb_build_object('booking_id', b.id, 'space_title', s.title, 'deadline', 'T-48h')
  FROM public.bookings b
  JOIN public.spaces s ON s.id = b.space_id
  JOIN public.profiles p ON p.id = s.host_id
  WHERE b.status = 'confirmed'
    AND p.stripe_connected = FALSE
    AND ((b.booking_date + b.start_time) AT TIME ZONE 'Europe/Rome') BETWEEN 
        (NOW() AT TIME ZONE 'Europe/Rome' + INTERVAL '48 hours') 
        AND (NOW() AT TIME ZONE 'Europe/Rome' + INTERVAL '72 hours')
    AND b.frozen_at IS NULL;
  $$
);