-- Fix RLS policies for booking_reviews table
DROP POLICY IF EXISTS "Users can view their own booking reviews" ON public.booking_reviews;

-- Create a corrected RLS policy for viewing reviews
CREATE POLICY "Users can view their own booking reviews" 
ON public.booking_reviews 
FOR SELECT 
USING (
  auth.uid() = author_id 
  OR auth.uid() = target_id 
  OR (
    is_visible = true 
    AND EXISTS (
      SELECT 1 
      FROM public.bookings booking
      JOIN public.spaces space ON space.id = booking.space_id
      WHERE booking.id = booking_reviews.booking_id 
      AND space.host_id = auth.uid()
    )
  )
);

-- Fix the create policy to properly validate booking relationship
DROP POLICY IF EXISTS "Users can create their own booking reviews" ON public.booking_reviews;

CREATE POLICY "Users can create their own booking reviews" 
ON public.booking_reviews 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id 
  AND EXISTS (
    SELECT 1 
    FROM public.bookings b 
    WHERE b.id = booking_id 
    AND (
      b.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 
        FROM public.spaces s 
        WHERE s.id = b.space_id 
        AND s.host_id = auth.uid()
      )
    )
  )
);