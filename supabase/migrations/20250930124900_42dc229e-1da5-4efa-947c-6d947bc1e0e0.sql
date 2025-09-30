-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can manage messages in conversations" ON public.messages;

-- Create comprehensive policy for messages that handles both booking and conversation contexts
CREATE POLICY "Users can access messages"
ON public.messages
FOR ALL
USING (
  -- Allow access if user is part of booking context
  (booking_id IS NOT NULL AND (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id 
      AND (b.user_id = auth.uid() OR b.space_id IN (
        SELECT id FROM public.spaces WHERE host_id = auth.uid()
      ))
    )
  ))
  OR
  -- Allow access if user is part of conversation context
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id 
    AND (c.host_id = auth.uid() OR c.coworker_id = auth.uid())
  ))
)
WITH CHECK (
  -- Can only insert messages where user is sender
  sender_id = auth.uid()
  AND (
    -- For booking messages: must be participant
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id 
      AND (b.user_id = auth.uid() OR b.space_id IN (
        SELECT id FROM public.spaces WHERE host_id = auth.uid()
      ))
    ))
    OR
    -- For conversation messages: must be participant
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id 
      AND (c.host_id = auth.uid() OR c.coworker_id = auth.uid())
    ))
  )
);