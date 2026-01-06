-- Add cancellation_policy to bookings table
ALTER TABLE public.bookings
ADD COLUMN cancellation_policy text;

-- Create function to copy cancellation policy from workspace
CREATE OR REPLACE FUNCTION public.copy_booking_cancellation_policy()
RETURNS TRIGGER AS $$
DECLARE
    workspace_policy text;
BEGIN
    -- Fetch the current cancellation policy from the related workspace
    SELECT cancellation_policy INTO workspace_policy
    FROM public.workspaces
    WHERE id = NEW.space_id;

    -- If workspace is found, use its policy. Otherwise default to 'moderate'.
    -- Also handle case where workspace_policy might be null in the DB
    IF workspace_policy IS NULL THEN
        workspace_policy := 'moderate';
    END IF;

    -- Set the policy on the new booking record
    NEW.cancellation_policy := workspace_policy;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger to run BEFORE INSERT
CREATE TRIGGER on_booking_create_copy_policy
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.copy_booking_cancellation_policy();

-- Backfill existing bookings
-- We use a DO block to ensure this runs as a single transaction block logic
DO $$
BEGIN
    UPDATE public.bookings b
    SET cancellation_policy = COALESCE(w.cancellation_policy, 'moderate')
    FROM public.workspaces w
    WHERE b.space_id = w.id
    AND b.cancellation_policy IS NULL;

    -- Handle orphan bookings (where workspace might have been deleted, though FK usually prevents this, but good for safety)
    UPDATE public.bookings
    SET cancellation_policy = 'moderate'
    WHERE cancellation_policy IS NULL;
END $$;
