-- Enable real-time for messages table (private_messages already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Ensure both tables have REPLICA IDENTITY FULL for complete row data in real-time
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE private_messages REPLICA IDENTITY FULL;