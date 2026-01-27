-- SINGULARITY CLEANUP: Fix workspaces→spaces and remove duplicate constraints/indices

-- 1. FIX CRITICAL: Update copy_booking_cancellation_policy to use 'spaces'
CREATE OR REPLACE FUNCTION public.copy_booking_cancellation_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    space_policy text;
BEGIN
    -- FIXED: Changed from public.workspaces to public.spaces
    SELECT cancellation_policy INTO space_policy
    FROM public.spaces
    WHERE id = NEW.space_id;

    IF space_policy IS NULL THEN
        space_policy := 'moderate';
    END IF;

    NEW.cancellation_policy := space_policy;
    RETURN NEW;
END;
$$;

-- 2. DROP DUPLICATE CONSTRAINTS on booking_reviews (must drop constraint before index)
ALTER TABLE public.booking_reviews DROP CONSTRAINT IF EXISTS booking_reviews_unique_host_entry;
ALTER TABLE public.booking_reviews DROP CONSTRAINT IF EXISTS booking_reviews_unique_author_per_booking;

-- 3. DROP DUPLICATE INDICES on booking_reviews  
DROP INDEX IF EXISTS public.idx_booking_reviews_unique_author_per_booking;
DROP INDEX IF EXISTS public.idx_booking_reviews_booking_id;