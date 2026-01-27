-- Fix PGRST201: Drop duplicate foreign key constraint
-- The payments table has two FK constraints to bookings:
-- 1. payments_booking_id_fkey (original, ON DELETE CASCADE)
-- 2. fk_payments_booking_id (duplicate, ON DELETE SET NULL)
-- 
-- We keep the original CASCADE behavior as it's the correct semantic
-- for a payment-booking relationship.

ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS fk_payments_booking_id;

COMMENT ON CONSTRAINT payments_booking_id_fkey ON public.payments IS 
'Foreign key to bookings. ON DELETE CASCADE ensures payments are removed when booking is deleted.';