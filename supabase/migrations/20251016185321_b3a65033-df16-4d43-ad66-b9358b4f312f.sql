-- Add GPS coordinate validation to space publish requirements trigger
CREATE OR REPLACE FUNCTION public.validate_space_publish_requirements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- 2. Check GPS coordinates (NEW VALIDATION)
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
      RAISE EXCEPTION 'Cannot publish space: GPS coordinates required. Select address from autocomplete suggestions.';
    END IF;
    
    -- 3. Check Stripe connection
    IF COALESCE(host_profile.stripe_connected, FALSE) = FALSE THEN
      RAISE EXCEPTION 'Cannot publish space: Stripe account not connected. Complete Stripe onboarding at /host/onboarding step 2.';
    END IF;
    
    -- 4. Check KYC verification
    IF COALESCE(host_profile.kyc_documents_verified, FALSE) = FALSE THEN
      RAISE EXCEPTION 'Cannot publish space: Identity verification required. Upload KYC documents and wait for admin approval.';
    END IF;
    
    -- 5. Check fiscal_regime in profiles (stored there, not in tax_details)
    IF host_profile.fiscal_regime IS NULL OR LENGTH(TRIM(host_profile.fiscal_regime)) = 0 THEN
      RAISE EXCEPTION 'Cannot publish space: Fiscal regime (Regime Fiscale) required. Complete fiscal data at /host/onboarding step 3.';
    END IF;
    
    -- 6. Check tax_details existence and completeness (payment + address info)
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
$function$;