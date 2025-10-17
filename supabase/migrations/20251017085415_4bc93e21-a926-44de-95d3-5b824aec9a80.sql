-- Migration: Add priority to support_tickets and user_notifications

-- Add priority to support_tickets
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'support_tickets' AND column_name = 'priority'
  ) THEN
    ALTER TABLE support_tickets 
    ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' 
    CHECK (priority IN ('low', 'normal', 'high', 'critical'));
  END IF;
END $$;

-- Add priority to user_notifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE user_notifications 
    ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' 
    CHECK (priority IN ('low', 'normal', 'high', 'critical'));
  END IF;
END $$;

-- Create index for filtering high priority tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority 
  ON support_tickets(priority, status, created_at DESC);

-- Create index for filtering high priority notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_priority 
  ON user_notifications(user_id, priority, is_read, created_at DESC);

COMMENT ON COLUMN support_tickets.priority IS 'Priority level: low, normal, high, critical';
COMMENT ON COLUMN user_notifications.priority IS 'Priority level: low, normal, high, critical';