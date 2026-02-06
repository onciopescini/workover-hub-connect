-- Allow any authenticated user (including hosts) to create bookings for themselves
DROP POLICY IF EXISTS "Coworkers can create bookings" ON public.bookings;

CREATE POLICY "Authenticated users can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);
