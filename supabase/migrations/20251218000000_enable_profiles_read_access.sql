-- Enable read access for all authenticated users to profiles
-- This replaces previous restrictive policies that blocked access based on networking status or role
-- Addresses the issue where Coworkers could not see Host Stripe status during checkout

-- Drop existing restrictive read policies to avoid conflicts and confusion
DROP POLICY IF EXISTS "Limited public profile access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profile data only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view limited public profile data" ON public.profiles;
DROP POLICY IF EXISTS "Public view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Admins and networked profiles viewable" ON public.profiles;

-- Create the new simplified policy
CREATE POLICY "Enable read access for all authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
