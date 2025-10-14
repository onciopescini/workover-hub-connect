-- =====================================================
-- FASE 1: ITALIAN FISCAL COMPLIANCE - RLS SECURITY
-- Step 2: Critical Security Policies (Alternative)
-- =====================================================

-- Note: RLS policies don't support NEW/OLD references
-- We'll use trigger-based validation instead for Stripe checks

-- =====================================================
-- Step 2.1: Trigger to Block Publishing Without Stripe
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_space_publish_stripe()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to publish, check Stripe connection
  IF NEW.published = TRUE AND OLD.published = FALSE THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = NEW.host_id 
      AND stripe_connected = TRUE
    ) THEN
      RAISE EXCEPTION 'Cannot publish space without Stripe account connected';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_space_publish_stripe_trigger
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_space_publish_stripe();

-- =====================================================
-- Step 2.2: Trigger to Block Checkout if Host Lost Stripe
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_booking_host_stripe()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if host has Stripe connected
  IF NOT EXISTS (
    SELECT 1 
    FROM public.spaces s
    JOIN public.profiles p ON p.id = s.host_id
    WHERE s.id = NEW.space_id
    AND p.stripe_connected = TRUE
  ) THEN
    RAISE EXCEPTION 'Cannot create booking: host Stripe account not connected';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_booking_host_stripe_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_host_stripe();

-- =====================================================
-- Step 2.3: Triggers to Block Actions Without Verified Email
-- =====================================================

-- Block space creation without verified email
CREATE OR REPLACE FUNCTION public.validate_space_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = NEW.host_id
    AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot create space: email not verified';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER validate_space_email_verified_trigger
  BEFORE INSERT ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_space_email_verified();

-- Block booking without verified email
CREATE OR REPLACE FUNCTION public.validate_booking_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = NEW.user_id
    AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot create booking: email not verified';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE TRIGGER validate_booking_email_verified_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_email_verified();