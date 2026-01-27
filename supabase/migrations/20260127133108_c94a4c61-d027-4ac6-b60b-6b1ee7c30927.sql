-- =====================================================
-- P2: Performance Optimization - Index Cleanup & Addition
-- =====================================================

-- 1. Drop duplicate indexes (if they exist)
DROP INDEX IF EXISTS idx_bookings_space;
DROP INDEX IF EXISTS idx_bookings_space_status;

-- 2. Add missing strategic indexes
-- Standalone status index for admin filters
CREATE INDEX IF NOT EXISTS idx_bookings_status_partial 
ON bookings(status) WHERE deleted_at IS NULL;

-- Payment status for reconciliation
CREATE INDEX IF NOT EXISTS idx_payments_status 
ON payments(status);

-- Payment status combined for host queries
CREATE INDEX IF NOT EXISTS idx_payments_host_status 
ON payments(payment_status);

-- Stripe connected hosts for verification queries
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_active 
ON profiles(id) WHERE stripe_connected = true;

-- =====================================================
-- P3: Security Hardening - Critical Functions
-- =====================================================

-- 1. Fix is_admin function (HIGH priority)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = is_admin.user_id
  );
$$;

-- 2. Fix check_self_booking function
CREATE OR REPLACE FUNCTION public.check_self_booking(
  p_space_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM spaces 
    WHERE id = p_space_id 
    AND host_id = p_user_id
  );
END;
$$;

-- 3. Fix cleanup_expired_slots function
CREATE OR REPLACE FUNCTION public.cleanup_expired_slots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bookings
  SET 
    status = 'cancelled',
    cancellation_reason = 'expired_reservation',
    cancelled_at = now(),
    updated_at = now()
  WHERE slot_reserved_until IS NOT NULL
    AND slot_reserved_until < now()
    AND status = 'pending'
    AND deleted_at IS NULL;
END;
$$;

-- 4. Fix handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_profile_count integer;
BEGIN
  SELECT COUNT(*) INTO existing_profile_count FROM profiles WHERE id = NEW.id;
  
  IF existing_profile_count = 0 THEN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Fix calculate_space_weighted_rating function
CREATE OR REPLACE FUNCTION public.calculate_space_weighted_rating(space_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  weighted_rating numeric;
BEGIN
  SELECT COALESCE(AVG(rating)::numeric, 0)
  INTO weighted_rating
  FROM space_reviews
  WHERE space_id = space_id_param
    AND is_visible = true;
  
  RETURN ROUND(weighted_rating, 2);
END;
$$;

-- 6. Fix get_space_reviews function
DROP FUNCTION IF EXISTS public.get_space_reviews(uuid);
CREATE OR REPLACE FUNCTION public.get_space_reviews(space_id_param uuid)
RETURNS TABLE (
  id uuid,
  booking_id uuid,
  space_id uuid,
  author_id uuid,
  rating integer,
  content text,
  is_visible boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author_first_name text,
  author_last_name text,
  author_profile_photo_url text,
  booking_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.booking_id,
    sr.space_id,
    sr.author_id,
    sr.rating,
    sr.content,
    sr.is_visible,
    sr.created_at,
    sr.updated_at,
    p.first_name AS author_first_name,
    p.last_name AS author_last_name,
    p.profile_photo_url AS author_profile_photo_url,
    b.booking_date
  FROM space_reviews sr
  INNER JOIN profiles p ON sr.author_id = p.id
  INNER JOIN bookings b ON sr.booking_id = b.id
  WHERE sr.space_id = space_id_param
    AND sr.is_visible = true
  ORDER BY sr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_space_reviews(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_space_weighted_rating(uuid) TO anon, authenticated;