-- Add soft delete column to spaces table
ALTER TABLE public.spaces ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for non-deleted spaces (partial index for better performance)
CREATE INDEX idx_spaces_deleted_at ON public.spaces(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted records
DROP POLICY IF EXISTS "Anyone can view published spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can view their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can update their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can delete their own spaces" ON public.spaces;

-- Recreate policies with deleted_at check
CREATE POLICY "Anyone can view published spaces" ON public.spaces
FOR SELECT USING (deleted_at IS NULL AND published = true);

CREATE POLICY "Hosts can view their own spaces" ON public.spaces
FOR SELECT USING (deleted_at IS NULL AND host_id = auth.uid());

CREATE POLICY "Hosts can update their own spaces" ON public.spaces
FOR UPDATE USING (deleted_at IS NULL AND host_id = auth.uid());

CREATE POLICY "Hosts can delete their own spaces" ON public.spaces
FOR DELETE USING (deleted_at IS NULL AND host_id = auth.uid());

-- Add policy for admins to restore soft-deleted spaces
CREATE POLICY "Admins can update all spaces including deleted" ON public.spaces
FOR UPDATE USING (is_admin(auth.uid()));

-- Add policy for admins to view all spaces including deleted
CREATE POLICY "Admins can view all spaces including deleted" ON public.spaces
FOR SELECT USING (is_admin(auth.uid()));