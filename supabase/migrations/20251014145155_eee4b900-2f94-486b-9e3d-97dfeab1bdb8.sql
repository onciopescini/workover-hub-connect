-- =====================================================
-- FASE 1: Add Booking Status Extensions & Fiscal Tracking
-- =====================================================

-- Step 1: Extend booking_status enum with new values
DO $$
BEGIN
  -- Add 'served' status
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'served' AND enumtypid = 'booking_status'::regtype) THEN
    ALTER TYPE booking_status ADD VALUE 'served';
  END IF;
  
  -- Add 'refunded' status
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'refunded' AND enumtypid = 'booking_status'::regtype) THEN
    ALTER TYPE booking_status ADD VALUE 'refunded';
  END IF;
  
  -- Add 'disputed' status
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'disputed' AND enumtypid = 'booking_status'::regtype) THEN
    ALTER TYPE booking_status ADD VALUE 'disputed';
  END IF;
  
  -- Add 'frozen' status
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'frozen' AND enumtypid = 'booking_status'::regtype) THEN
    ALTER TYPE booking_status ADD VALUE 'frozen';
  END IF;
END$$;

-- Step 2: Add service completion tracking columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS service_completed_by TEXT,
  ADD COLUMN IF NOT EXISTS host_issue_reported BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS issue_report_reason TEXT;

-- Step 3: Add payout tracking columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payout_scheduled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payout_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payout_stripe_transfer_id TEXT;

-- Step 4: Add frozen booking tracking columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS frozen_reason TEXT,
  ADD COLUMN IF NOT EXISTS auto_cancel_scheduled_at TIMESTAMP WITH TIME ZONE;

-- Step 5: Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_bookings_service_completed_at 
  ON public.bookings(service_completed_at) 
  WHERE service_completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payout_scheduled 
  ON public.bookings(payout_scheduled_at) 
  WHERE payout_scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_frozen_at 
  ON public.bookings(frozen_at) 
  WHERE frozen_at IS NOT NULL;

-- Step 6: Add documentation comments
COMMENT ON COLUMN public.bookings.service_completed_by IS 'Can be: system, host, or user_id';
COMMENT ON COLUMN public.bookings.frozen_at IS 'Timestamp when booking was frozen due to host Stripe disconnection';
COMMENT ON COLUMN public.bookings.auto_cancel_scheduled_at IS 'Timestamp when auto-cancellation was scheduled for frozen booking';