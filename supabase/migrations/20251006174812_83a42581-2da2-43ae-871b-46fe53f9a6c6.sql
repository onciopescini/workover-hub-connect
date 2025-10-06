-- Fix RLS policies for messages table to allow marking booking messages as read

-- Drop existing "ALL" policy
DROP POLICY IF EXISTS "Users can access messages" ON messages;

-- Recreate SELECT policy (unchanged logic)
CREATE POLICY "Users can view messages"
ON messages
FOR SELECT
TO authenticated
USING (
  (
    booking_id IS NOT NULL 
    AND (
      sender_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = messages.booking_id
        AND (
          b.user_id = auth.uid() 
          OR b.space_id IN (
            SELECT id FROM spaces WHERE host_id = auth.uid()
          )
        )
      )
    )
  )
  OR
  (
    conversation_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.host_id = auth.uid() OR c.coworker_id = auth.uid())
    )
  )
);

-- Recreate INSERT policy (unchanged logic)
CREATE POLICY "Users can send messages"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    (
      booking_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.id = messages.booking_id
        AND (
          b.user_id = auth.uid() 
          OR b.space_id IN (
            SELECT id FROM spaces WHERE host_id = auth.uid()
          )
        )
      )
    )
    OR
    (
      conversation_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id
        AND (c.host_id = auth.uid() OR c.coworker_id = auth.uid())
      )
    )
  )
);

-- NEW: UPDATE policy to allow marking received messages as read
CREATE POLICY "Users can mark received messages as read"
ON messages
FOR UPDATE
TO authenticated
USING (
  -- Allow UPDATE only if user is part of the booking/conversation
  (
    booking_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = messages.booking_id
      AND (
        b.user_id = auth.uid() 
        OR b.space_id IN (
          SELECT id FROM spaces WHERE host_id = auth.uid()
        )
      )
    )
    -- And the message was NOT sent by them (can only mark received messages)
    AND sender_id != auth.uid()
  )
  OR
  (
    conversation_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.host_id = auth.uid() OR c.coworker_id = auth.uid())
    )
    AND sender_id != auth.uid()
  )
)
WITH CHECK (
  -- Only allow setting is_read to true
  is_read = true
);