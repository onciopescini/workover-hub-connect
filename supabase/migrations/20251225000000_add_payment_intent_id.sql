-- Add stripe_payment_intent_id to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_pi ON public.bookings (stripe_payment_intent_id);

-- Add stripe_payment_intent_id to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Create index for payments table as well (good practice)
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON public.payments (stripe_payment_intent_id);
