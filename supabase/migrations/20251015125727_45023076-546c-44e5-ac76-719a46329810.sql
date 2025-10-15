-- ONDATA 1 - FIX BLOCCANTI CRITICI
-- Fix 1.1: Idempotency per webhook Stripe (previene doppi pagamenti)

-- Aggiungi colonna stripe_event_id per idempotency
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_event_unique ON payments(stripe_event_id) WHERE stripe_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_stripe_event ON payments(stripe_event_id) WHERE stripe_event_id IS NOT NULL;

-- Fix 1.2: Indici compositi per performance critiche
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, booking_date) WHERE status IN ('pending', 'confirmed', 'served');
CREATE INDEX IF NOT EXISTS idx_bookings_payout_scheduling ON bookings(status, service_completed_at, payout_scheduled_at) WHERE status = 'served' AND payout_scheduled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_status ON payments(created_at, payment_status) WHERE payment_status IN ('completed', 'pending');
CREATE INDEX IF NOT EXISTS idx_invoices_recipient_date ON invoices(recipient_id, invoice_date);

-- Fix 1.3: RLS completo su tax_details (mancava policy admin e UPDATE/DELETE)
DROP POLICY IF EXISTS "Admins manage all tax details" ON public.tax_details;
DROP POLICY IF EXISTS "Users manage own tax details" ON public.tax_details;

CREATE POLICY "Users manage own tax details" ON public.tax_details 
  FOR ALL 
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Admins manage all tax details" ON public.tax_details 
  FOR ALL 
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Fix 1.4: Storage policies mancanti per documenti sensibili
-- Policy per bucket non-fiscal-receipts (se non esistono già)
DO $$ 
BEGIN
  -- Check if policy exists first
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users own non-fiscal receipts'
  ) THEN
    CREATE POLICY "Users own non-fiscal receipts" ON storage.objects FOR SELECT
    USING (
      bucket_id = 'non-fiscal-receipts' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins see all non-fiscal receipts'
  ) THEN
    CREATE POLICY "Admins see all non-fiscal receipts" ON storage.objects FOR SELECT
    USING (bucket_id = 'non-fiscal-receipts' AND is_admin(auth.uid()));
  END IF;

  -- Policy per bucket invoices (se esiste)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users own invoices storage'
  ) THEN
    CREATE POLICY "Users own invoices storage" ON storage.objects FOR SELECT
    USING (
      bucket_id = 'invoices' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins see all invoices storage'
  ) THEN
    CREATE POLICY "Admins see all invoices storage" ON storage.objects FOR SELECT
    USING (bucket_id = 'invoices' AND is_admin(auth.uid()));
  END IF;

  -- Policy per bucket host-invoices-guide (se esiste)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Hosts access invoice guides'
  ) THEN
    CREATE POLICY "Hosts access invoice guides" ON storage.objects FOR SELECT
    USING (
      bucket_id = 'host-invoices-guide' 
      AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'host'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins manage invoice guides'
  ) THEN
    CREATE POLICY "Admins manage invoice guides" ON storage.objects FOR ALL
    USING (bucket_id = 'host-invoices-guide' AND is_admin(auth.uid()));
  END IF;
END $$;

-- Fix 1.5: Constraint per prevenire stati inconsistenti
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS check_refund_no_transfer;
ALTER TABLE public.payments ADD CONSTRAINT check_refund_no_transfer 
  CHECK (
    payment_status != 'refunded' 
    OR stripe_transfer_id IS NULL 
    OR payment_status = 'refunded'
  );

-- Fix 1.6: Aggiungi colonna per tracking auto-cancel frozen bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS auto_cancel_scheduled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_bookings_frozen_autocancel ON bookings(status, frozen_at, auto_cancel_scheduled_at) 
  WHERE status = 'frozen' AND auto_cancel_scheduled_at IS NULL;