-- =====================================================
-- CRON JOBS RESURRECTION + SOFT DELETE MIGRATION (Fixed)
-- Purpose: Enable maintenance automation and booking soft-delete
-- =====================================================

-- 1. ADD deleted_at to bookings for soft-delete (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Create partial index for active bookings (queries only non-deleted)
CREATE INDEX IF NOT EXISTS idx_bookings_not_deleted 
ON public.bookings(id) 
WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.bookings.deleted_at IS 'Soft-delete timestamp. NULL means active, non-NULL means deleted.';