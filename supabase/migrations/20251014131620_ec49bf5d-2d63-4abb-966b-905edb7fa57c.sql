-- CRON JOB 4: Send Host Invoice Reminders T+7 + Compliance Alert
SELECT cron.schedule(
  'send-invoice-reminders-t7',
  '0 9 * * *',
  $$
  WITH t7_hosts AS (
    SELECT DISTINCT
      s.host_id,
      COUNT(b.id) as invoice_count,
      SUM(p.host_amount) as total_amount
    FROM public.bookings b
    JOIN public.spaces s ON s.id = b.space_id
    JOIN public.profiles prof ON prof.id = s.host_id
    JOIN public.payments p ON p.booking_id = b.id
    WHERE b.status = 'served'
      AND prof.fiscal_regime IN ('forfettario', 'ordinario')
      AND p.host_invoice_required = TRUE
      AND b.service_completed_at < NOW() - INTERVAL '7 days'
      AND b.service_completed_at > NOW() - INTERVAL '8 days'
    GROUP BY s.host_id
  )
  INSERT INTO public.user_notifications (user_id, type, title, content, metadata)
  SELECT 
    host_id,
    'invoice',
    '⚠️ URGENTE: Ultimo sollecito fatture',
    'Fatture scadute da oltre 7 giorni: ' || invoice_count || ' fatture per €' || total_amount,
    jsonb_build_object('invoice_count', invoice_count, 'total_amount', total_amount, 'reminder_type', 'T+7', 'severity', 'high')
  FROM t7_hosts;

  UPDATE public.profiles
  SET compliance_alert = TRUE
  WHERE id IN (SELECT host_id FROM t7_hosts);
  $$
);