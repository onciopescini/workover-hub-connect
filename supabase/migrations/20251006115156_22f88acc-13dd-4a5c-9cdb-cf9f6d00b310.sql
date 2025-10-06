-- Fix connections RLS policy to allow both sender and receiver to update
DROP POLICY IF EXISTS "Users manage connections" ON connections;

CREATE POLICY "Users manage connections" ON connections
FOR ALL
USING (
  (auth.uid() = sender_id) OR (auth.uid() = receiver_id)
)
WITH CHECK (
  (auth.uid() = sender_id) OR (auth.uid() = receiver_id)
);