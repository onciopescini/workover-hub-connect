-- Fix trigger to use correct column names from tax_details table
-- fiscal_regime is stored in profiles, not tax_details

DROP TRIGGER IF EXISTS validate_space_publish_requirements ON public.spaces;
DROP FUNCTION IF EXISTS public.validate_space_publish_requirements();

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
    
    -- 4. Check fiscal_regime in profiles (stored there, not in tax_details)
    IF host_profile.fiscal_regime IS NULL OR LENGTH(TRIM(host_profile.fiscal_regime)) = 0 THEN
      RAISE EXCEPTION 'Cannot publish space: Fiscal regime (Regime Fiscale) required. Complete fiscal data at /host/onboarding step 3.';
    END IF;
    
    -- 5. Check tax_details existence and completeness (payment + address info)
    SELECT * INTO tax_record 
    FROM public.tax_details 
    WHERE profile_id = NEW.host_id 
      AND is_primary = TRUE 
      AND valid_to IS NULL
    LIMIT 1;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot publish space: No active tax details found. Complete fiscal data at /host/onboarding step 3.';
    END IF;
    
    IF tax_record.iban IS NULL OR LENGTH(TRIM(tax_record.iban)) = 0 THEN
      RAISE EXCEPTION 'Cannot publish space: IBAN required for payments. Complete fiscal data at /host/onboarding step 3.';
    END IF;
    
    IF tax_record.address_line1 IS NULL OR LENGTH(TRIM(tax_record.address_line1)) = 0 THEN
      RAISE EXCEPTION 'Cannot publish space: Complete address required. Complete fiscal data at /host/onboarding step 3.';
    END IF;
    
    -- All checks passed
    RAISE NOTICE 'Space publication validated successfully: host_id=%, space_id=%', NEW.host_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_space_publish_requirements
BEFORE UPDATE ON public.spaces
FOR EACH ROW EXECUTE FUNCTION validate_space_publish_requirements();

COMMENT ON FUNCTION public.validate_space_publish_requirements() IS 
'Enforces space publication: Stripe connected, KYC verified, fiscal_regime in profiles, complete tax_details (IBAN + address). Blocks published=true if requirements missing.';