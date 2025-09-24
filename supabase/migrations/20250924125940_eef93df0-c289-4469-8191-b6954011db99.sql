-- Add guests_count to bookings table
ALTER TABLE public.bookings ADD COLUMN guests_count integer DEFAULT 1 NOT NULL;

-- Add cancellation_policy to spaces table  
CREATE TYPE cancellation_policy AS ENUM ('flexible', 'moderate', 'strict');
ALTER TABLE public.spaces ADD COLUMN cancellation_policy cancellation_policy DEFAULT 'moderate';