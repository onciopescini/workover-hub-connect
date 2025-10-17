import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import type { CoworkerFiscalData } from '@/components/booking/checkout/CheckoutFiscalFields';
import { createContextualLogger } from '@/lib/logger';

const logger = createContextualLogger('CoworkerFiscalData');

interface TaxDetailsRow {
  tax_id: string | null;
  vat_number: string | null;
  entity_type: string | null;
  address_line1: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
}

/**
 * Hook to fetch and pre-fill coworker fiscal data for checkout
 * 
 * Retrieves the user's saved tax details and converts them to the format
 * required by the CheckoutFiscalFields component.
 */
export function useCoworkerFiscalData() {
  const auth = useAuth();
  const userId = auth.authState.user?.id;
  const profile = auth.authState.profile;

  const query = useQuery({
    queryKey: ['coworker-fiscal-data', userId],
    queryFn: async (): Promise<CoworkerFiscalData | null> => {
      if (!userId) {
        return null;
      }

      try {
        logger.debug('Fetching coworker fiscal data', { userId });

        // Fetch active tax details from tax_details table
        const { data: taxDetails, error } = await supabase
          .from('tax_details')
          .select('tax_id, vat_number, entity_type, address_line1, city, province, postal_code')
          .eq('profile_id', userId)
          .eq('is_primary', true)
          .is('valid_to', null)
          .maybeSingle();

        if (error) {
          logger.error('Error fetching tax details', error);
          throw error;
        }

        // If no tax details, return empty data
        if (!taxDetails) {
          logger.debug('No tax details found for user');
          return {
            tax_id: '',
            is_business: false,
            pec_email: profile?.pec_email || '',
            sdi_code: profile?.sdi_code || '',
            billing_address: '',
            billing_city: '',
            billing_province: '',
            billing_postal_code: ''
          };
        }

        // Map tax_details to CoworkerFiscalData format
        const isBusiness = taxDetails.entity_type === 'business' || taxDetails.entity_type === 'freelance';
        
        const fiscalData: CoworkerFiscalData = {
          // Use VAT number if business, otherwise tax_id (CF)
          tax_id: isBusiness 
            ? (taxDetails.vat_number || '') 
            : (taxDetails.tax_id || ''),
          is_business: isBusiness,
          pec_email: profile?.pec_email || '',
          sdi_code: profile?.sdi_code || '',
          billing_address: taxDetails.address_line1 || '',
          billing_city: taxDetails.city || '',
          billing_province: taxDetails.province || '',
          billing_postal_code: taxDetails.postal_code || ''
        };

        logger.info('Fiscal data loaded successfully', {
          userId,
          isBusiness,
          hasAddress: !!fiscalData.billing_address
        });

        return fiscalData;

      } catch (error) {
        logger.error('Failed to load fiscal data', error as Error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });

  return {
    fiscalData: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  };
}

/**
 * Check if user has complete fiscal data saved
 */
export function useHasFiscalData() {
  const { fiscalData, isLoading } = useCoworkerFiscalData();

  const isComplete = fiscalData ? (
    !!fiscalData.tax_id &&
    !!fiscalData.billing_address &&
    !!fiscalData.billing_city &&
    !!fiscalData.billing_province &&
    !!fiscalData.billing_postal_code &&
    // If business, require PEC or SDI
    (!fiscalData.is_business || fiscalData.pec_email || fiscalData.sdi_code)
  ) : false;

  return {
    hasFiscalData: isComplete,
    isLoading,
    fiscalData
  };
}
