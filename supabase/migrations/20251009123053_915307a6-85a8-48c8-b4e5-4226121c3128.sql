-- STEP 1: Aggiungi i nuovi valori all'enum booking_status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_approval' AND enumtypid = 'booking_status'::regtype) THEN
    ALTER TYPE booking_status ADD VALUE 'pending_approval';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_payment' AND enumtypid = 'booking_status'::regtype) THEN
    ALTER TYPE booking_status ADD VALUE 'pending_payment';
  END IF;
END $$;

-- STEP 2: Aggiungi le nuove colonne alla tabella bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS approval_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_reminder_sent BOOLEAN DEFAULT FALSE;

-- STEP 3: Crea indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_bookings_approval_deadline 
ON public.bookings(approval_deadline) 
WHERE approval_deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline 
ON public.bookings(payment_deadline) 
WHERE payment_deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_status_urgent 
ON public.bookings(status, is_urgent);

-- STEP 4: Aggiungi commenti per documentazione
COMMENT ON COLUMN public.bookings.approval_deadline IS 'Deadline per approvazione host (24h o 2h prima della prenotazione)';
COMMENT ON COLUMN public.bookings.payment_deadline IS 'Deadline per pagamento coworker dopo approvazione (2h)';
COMMENT ON COLUMN public.bookings.is_urgent IS 'Flag per prenotazioni che scadono entro 2h';
COMMENT ON COLUMN public.bookings.approval_reminder_sent IS 'Flag per tracciare reminder di approvazione inviato';
COMMENT ON COLUMN public.bookings.payment_reminder_sent IS 'Flag per tracciare reminder di pagamento inviato';