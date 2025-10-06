-- Drop existing policies for private_chats and private_messages
DROP POLICY IF EXISTS "Users manage private chats" ON private_chats;
DROP POLICY IF EXISTS "Users manage private messages" ON private_messages;

-- Private Chats: SELECT policy
CREATE POLICY "Users can view their private chats"
ON private_chats
FOR SELECT
TO authenticated
USING (
  auth.uid() = participant_1_id 
  OR auth.uid() = participant_2_id
);

-- Private Chats: INSERT policy (relaxed to allow suggestions)
CREATE POLICY "Users can create private chats"
ON private_chats
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = participant_1_id
  AND (
    -- Allow if there's an accepted connection
    EXISTS (
      SELECT 1 FROM connections 
      WHERE status = 'accepted' 
      AND (
        (sender_id = participant_1_id AND receiver_id = participant_2_id)
        OR (sender_id = participant_2_id AND receiver_id = participant_1_id)
      )
    )
    OR
    -- Allow if there are mutual connection suggestions (shared space/event)
    (
      EXISTS (
        SELECT 1 FROM connection_suggestions 
        WHERE user_id = participant_1_id 
        AND suggested_user_id = participant_2_id
        AND reason IN ('shared_space', 'shared_event')
      )
      AND EXISTS (
        SELECT 1 FROM connection_suggestions 
        WHERE user_id = participant_2_id 
        AND suggested_user_id = participant_1_id
        AND reason IN ('shared_space', 'shared_event')
      )
    )
  )
);

-- Private Chats: UPDATE/DELETE policies
CREATE POLICY "Users can update their private chats"
ON private_chats
FOR UPDATE
TO authenticated
USING (
  auth.uid() = participant_1_id 
  OR auth.uid() = participant_2_id
);

CREATE POLICY "Users can delete their private chats"
ON private_chats
FOR DELETE
TO authenticated
USING (
  auth.uid() = participant_1_id 
  OR auth.uid() = participant_2_id
);

-- Private Messages: SELECT policy
CREATE POLICY "Users can view messages in their chats"
ON private_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM private_chats
    WHERE private_chats.id = private_messages.chat_id
    AND (
      auth.uid() = private_chats.participant_1_id 
      OR auth.uid() = private_chats.participant_2_id
    )
  )
);

-- Private Messages: INSERT policy
CREATE POLICY "Users can send messages in their chats"
ON private_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM private_chats
    WHERE private_chats.id = private_messages.chat_id
    AND (
      auth.uid() = private_chats.participant_1_id 
      OR auth.uid() = private_chats.participant_2_id
    )
  )
);

-- Private Messages: UPDATE policy (for marking as read)
CREATE POLICY "Users can mark received messages as read"
ON private_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM private_chats
    WHERE private_chats.id = private_messages.chat_id
    AND (
      auth.uid() = private_chats.participant_1_id 
      OR auth.uid() = private_chats.participant_2_id
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM private_chats
    WHERE private_chats.id = private_messages.chat_id
    AND (
      auth.uid() = private_chats.participant_1_id 
      OR auth.uid() = private_chats.participant_2_id
    )
  )
);