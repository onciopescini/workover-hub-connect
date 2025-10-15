-- =====================================================
-- ONDATA 3: FIX 3.5 - DAC7 DATA VALIDATION TRIGGER
-- =====================================================
-- Validate tax details completeness before marking DAC7 reporting threshold as met

-- Function to validate DAC7 data completeness
CREATE OR REPLACE FUNCTION public.validate_dac7_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tax_record RECORD;
  host_profile RECORD;
BEGIN
  -- Only validate when threshold is being marked as met
  IF NEW.reporting_threshold_met = TRUE AND (OLD.reporting_threshold_met IS NULL OR OLD.reporting_threshold_met = FALSE) THEN
    
    -- Get host profile
    SELECT * INTO host_profile
    FROM public.profiles
    WHERE id = NEW.host_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Host profile not found for DAC7 validation';
    END IF;
    
    -- Check if host has valid tax details
    SELECT * INTO tax_record
    FROM public.tax_details
    WHERE profile_id = NEW.host_id
      AND valid_to IS NULL
      AND is_primary = TRUE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: No active tax details found for host. Please complete tax information first.';
    END IF;
    
    -- Validate required fields based on entity type
    IF tax_record.entity_type = 'individual' THEN
      -- For individuals, require tax_id (Codice Fiscale)
      IF tax_record.tax_id IS NULL OR LENGTH(TRIM(tax_record.tax_id)) = 0 THEN
        RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: Tax ID (Codice Fiscale) is required for individual hosts';
      END IF;
      
      -- Validate tax_id format (16 characters for Italian CF)
      IF LENGTH(TRIM(tax_record.tax_id)) != 16 THEN
        RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: Invalid Tax ID format. Italian Codice Fiscale must be 16 characters';
      END IF;
      
    ELSIF tax_record.entity_type IN ('business', 'freelance') THEN
      -- For business/freelance, require both tax_id and vat_number
      IF tax_record.tax_id IS NULL OR LENGTH(TRIM(tax_record.tax_id)) = 0 THEN
        RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: Tax ID is required for business/freelance hosts';
      END IF;
      
      IF tax_record.vat_number IS NULL OR LENGTH(TRIM(tax_record.vat_number)) = 0 THEN
        RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: VAT Number (Partita IVA) is required for business/freelance hosts';
      END IF;
      
      -- Validate VAT number format (11 digits for Italian P.IVA)
      IF LENGTH(TRIM(tax_record.vat_number)) != 11 THEN
        RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: Invalid VAT Number format. Italian Partita IVA must be 11 digits';
      END IF;
    END IF;
    
    -- Validate address fields (required for DAC7)
    IF tax_record.address_line1 IS NULL OR LENGTH(TRIM(tax_record.address_line1)) = 0 THEN
      RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: Address is required in tax details';
    END IF;
    
    IF tax_record.city IS NULL OR LENGTH(TRIM(tax_record.city)) = 0 THEN
      RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: City is required in tax details';
    END IF;
    
    IF tax_record.postal_code IS NULL OR LENGTH(TRIM(tax_record.postal_code)) = 0 THEN
      RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: Postal code is required in tax details';
    END IF;
    
    IF tax_record.country_code IS NULL OR LENGTH(TRIM(tax_record.country_code)) = 0 THEN
      RAISE EXCEPTION 'Cannot mark DAC7 threshold as met: Country code is required in tax details';
    END IF;
    
    -- Validate IBAN for payment (optional but recommended warning)
    IF tax_record.iban IS NULL OR LENGTH(TRIM(tax_record.iban)) = 0 THEN
      RAISE WARNING 'DAC7 threshold met but IBAN is missing in tax details. This may cause payment delays.';
    END IF;
    
    -- Log successful validation
    RAISE NOTICE 'DAC7 data validation passed for host_id: %, reporting_year: %', NEW.host_id, NEW.reporting_year;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on dac7_reports table
DROP TRIGGER IF EXISTS trigger_validate_dac7_data ON public.dac7_reports;
CREATE TRIGGER trigger_validate_dac7_data
  BEFORE INSERT OR UPDATE ON public.dac7_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_dac7_data();

-- Add helpful comment
COMMENT ON FUNCTION public.validate_dac7_data() IS 'Validates tax details completeness before marking DAC7 reporting threshold as met. Ensures all required fields are present based on entity type.';
COMMENT ON TRIGGER trigger_validate_dac7_data ON public.dac7_reports IS 'Ensures tax details are complete before marking DAC7 threshold as met';