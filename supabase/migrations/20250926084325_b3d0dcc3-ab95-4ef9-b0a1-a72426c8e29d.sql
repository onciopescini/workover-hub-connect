-- Add test payment record for booking to enable review testing
INSERT INTO public.payments (
  booking_id,
  user_id, 
  amount,
  payment_status,
  host_amount,
  platform_fee,
  currency,
  created_at
) 
SELECT 
  'f32cfd96-fe01-4b5a-8cc8-5c603e6d56b0',
  'a1732078-2922-4e8b-b232-d020b971a398',
  50.00,
  'completed',
  45.00,
  5.00,
  'EUR',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.payments 
  WHERE booking_id = 'f32cfd96-fe01-4b5a-8cc8-5c603e6d56b0'
);