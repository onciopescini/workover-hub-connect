-- Add payment_status_enum column
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_status_enum TEXT DEFAULT 'pending';

-- Add stripe_payment_intent_id column if it doesn't exist (ensure robustness)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Add unique constraint to stripe_payment_intent_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_stripe_payment_intent_id_key'
    ) THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);
    END IF;
END $$;
