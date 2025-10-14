-- CRON JOB 4: Send Host Invoice Reminders T+3
SELECT cron.schedule(
  'send-invoice-reminders-t3',
  '0 9 * * *',
  $$
  WITH t3_hosts AS (
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
      AND (p.host_invoice_reminder_sent_at IS NULL OR p.host_invoice_reminder_sent_at < NOW() - INTERVAL '4 days')
      AND b.service_completed_at BETWEEN (NOW() - INTERVAL '4 days') AND (NOW() - INTERVAL '3 days')
    GROUP BY s.host_id
  )
  INSERT INTO public.user_notifications (user_id, type, title, content, metadata)
  SELECT 
    host_id,
    'invoice',
    'Promemoria: fatture da emettere',
    'Hai ' || invoice_count || ' fattura/e da emettere per un totale di €' || total_amount,
    jsonb_build_object('invoice_count', invoice_count, 'total_amount', total_amount, 'reminder_type', 'T+3')
  FROM t3_hosts;

  UPDATE public.payments
  SET host_invoice_reminder_sent_at = NOW()
  WHERE booking_id IN (
    SELECT b.id FROM public.bookings b
    WHERE b.status = 'served'
      AND b.service_completed_at BETWEEN (NOW() - INTERVAL '4 days') AND (NOW() - INTERVAL '3 days')
  );
  $$
);