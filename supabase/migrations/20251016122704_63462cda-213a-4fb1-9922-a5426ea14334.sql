-- ===== FASE 5: SQL Migration - Enhanced Space Publication Trigger =====
-- Fixed version with CASCADE drop

-- Drop existing trigger and function with CASCADE
DROP TRIGGER IF EXISTS validate_space_publish_stripe_trigger ON public.spaces;
DROP TRIGGER IF EXISTS validate_space_publish_stripe ON public.spaces;
DROP FUNCTION IF EXISTS public.validate_space_publish_stripe() CASCADE;

-- Create new comprehensive validation function
CREATE OR REPLACE FUNCTION public.validate_space_publish_requirements()
RETURNS TRIGGER AS $$
DECLARE
  host_profile RECORD;
  tax_record RECORD;
BEGIN
  -- Trigger only on UPDATE that publishes (published: false → true)
  IF TG_OP = 'UPDATE' AND NEW.published = TRUE AND OLD.published = FALSE THEN
    
    -- 1. Get host profile
    SELECT * INTO host_profile 
    FROM profiles 
    WHERE id = NEW.host_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Host profile not found for space publication';
    END IF;
    
    -- 2. Check Stripe connection
    IF COALESCE(host_profile.stripe_connected, FALSE) = FALSE THEN
      RAISE EXCEPTION 'Cannot publish space: Stripe account not connected. Complete Stripe onboarding at /host/onboarding step 2.';
    END IF;
    
    -- 3. Check KYC verification
    IF COALESCE(host_profile.kyc_documents_verified, FALSE) = FALSE THEN
      RAISE EXCEPTION 'Cannot publish space: Identity verification required. Upload KYC documents and wait for admin approval.';
    END IF;
    
    -- 4. Check tax_details existence and completeness
    SELECT * INTO tax_record 
    FROM public.tax_details 
    WHERE profile_id = NEW.host_id 
      AND is_primary = TRUE 
      AND valid_to IS NULL
    LIMIT 1;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot publish space: No active tax details found. Complete fiscal data at /host/onboarding step 3.';
    END IF;
    
    IF tax_record.regime_fiscale IS NULL OR LENGTH(TRIM(tax_record.regime_fiscale)) = 0 THEN
      RAISE EXCEPTION 'Cannot publish space: Fiscal regime (Regime Fiscale) required. Complete fiscal data at /host/onboarding step 3.';
    END IF;
    
    IF tax_record.iban IS NULL OR LENGTH(TRIM(tax_record.iban)) = 0 THEN
      RAISE EXCEPTION 'Cannot publish space: IBAN required for payments. Complete fiscal data at /host/onboarding step 3.';
    END IF;
    
    -- All checks passed
    RAISE NOTICE 'Space publication validated successfully: host_id=%, space_id=%', NEW.host_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to spaces table
CREATE TRIGGER validate_space_publish_requirements
BEFORE UPDATE ON public.spaces
FOR EACH ROW EXECUTE FUNCTION validate_space_publish_requirements();

-- Add documentation
COMMENT ON FUNCTION public.validate_space_publish_requirements() IS 
'Enforces space publication requirements: Stripe connected, KYC verified, complete tax details (regime_fiscale + IBAN). Blocks published=true if any requirement missing.';