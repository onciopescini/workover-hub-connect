-- =====================================================
-- FIX ALL broken functions/triggers referencing workspaces → spaces
-- =====================================================

-- 1. Drop ALL triggers on space_reviews that might use broken functions
DROP TRIGGER IF EXISTS on_space_review_change ON public.space_reviews;
DROP TRIGGER IF EXISTS trigger_update_workspace_rating ON public.space_reviews;
DROP TRIGGER IF EXISTS trigger_update_space_rating ON public.space_reviews;
DROP TRIGGER IF EXISTS space_reviews_rating_trigger ON public.space_reviews;

-- 2. Drop ALL broken functions with CASCADE
DROP FUNCTION IF EXISTS public.update_workspace_rating() CASCADE;
DROP FUNCTION IF EXISTS public.update_space_rating_aggregate(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.space_reviews_rating_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.update_space_rating_on_review() CASCADE;

-- 3. Create the CORRECT unified function
CREATE OR REPLACE FUNCTION public.update_space_rating_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _space_id uuid;
  _avg_rating numeric;
  _review_count integer;
BEGIN
  -- Get the space_id from the affected review
  IF TG_OP = 'DELETE' THEN
    _space_id := OLD.space_id;
  ELSE
    _space_id := NEW.space_id;
  END IF;

  -- Calculate new rating stats
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    COUNT(*)
  INTO _avg_rating, _review_count
  FROM public.space_reviews
  WHERE space_id = _space_id AND is_visible = true;

  -- Update the cached rating on the SPACES table (not workspaces!)
  UPDATE public.spaces
  SET
    cached_avg_rating = _avg_rating,
    cached_review_count = _review_count,
    updated_at = now()
  WHERE id = _space_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Create the single correct trigger
CREATE TRIGGER trigger_update_space_rating
AFTER INSERT OR UPDATE OR DELETE ON public.space_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_space_rating_on_review();

-- =====================================================
-- P1: Clean orphaned records
-- =====================================================

-- 1. Archive orphaned payments
CREATE TABLE IF NOT EXISTS public.archived_orphaned_payments (
  id uuid PRIMARY KEY,
  original_booking_id uuid,
  amount numeric,
  status text,
  created_at timestamptz,
  archived_at timestamptz DEFAULT now(),
  archive_reason text DEFAULT 'orphaned_booking_id'
);

INSERT INTO public.archived_orphaned_payments (id, original_booking_id, amount, status, created_at)
SELECT p.id, p.booking_id, p.amount, p.status, p.created_at
FROM payments p
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = p.booking_id)
ON CONFLICT (id) DO NOTHING;

DELETE FROM payments p
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = p.booking_id);

-- 2. Delete orphaned space_reviews
DELETE FROM space_reviews sr
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = sr.booking_id);

-- 3. Add FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_payments_booking_id' 
    AND table_name = 'payments'
  ) THEN
    ALTER TABLE public.payments
    ADD CONSTRAINT fk_payments_booking_id
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 4. RLS on archived table
ALTER TABLE public.archived_orphaned_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view archived payments" ON public.archived_orphaned_payments;
CREATE POLICY "Admins can view archived payments"
ON public.archived_orphaned_payments
FOR SELECT
USING (public.is_admin(auth.uid()));