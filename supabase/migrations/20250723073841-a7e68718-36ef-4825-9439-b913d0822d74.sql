-- Create index for performance on suspended users (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_at ON public.profiles(suspended_at) WHERE suspended_at IS NOT NULL;

-- Update RLS policies on spaces to block suspended hosts from creating/updating spaces
DROP POLICY IF EXISTS "Hosts can create their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can update their own spaces" ON public.spaces;

-- Recreate policies with suspension check
CREATE POLICY "Hosts can create their own spaces" ON public.spaces
FOR INSERT WITH CHECK (
  auth.uid() = host_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'host'::user_role 
    AND suspended_at IS NULL
    AND NOT space_creation_restricted
  )
);

CREATE POLICY "Hosts can update their own spaces" ON public.spaces
FOR UPDATE USING (
  auth.uid() = host_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND suspended_at IS NULL
  )
);

-- Note: Existing bookings are NOT affected by suspension - they can continue
-- This ensures guests can complete their bookings even if host is suspended