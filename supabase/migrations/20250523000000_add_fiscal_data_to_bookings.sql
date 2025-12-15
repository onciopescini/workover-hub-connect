-- Add fiscal_data to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS fiscal_data JSONB DEFAULT NULL;
