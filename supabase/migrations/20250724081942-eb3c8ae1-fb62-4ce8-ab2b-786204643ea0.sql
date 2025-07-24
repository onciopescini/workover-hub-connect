-- Enable real-time for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;

-- Ensure both tables have REPLICA IDENTITY FULL for complete row data in real-time
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE private_messages REPLICA IDENTITY FULL;