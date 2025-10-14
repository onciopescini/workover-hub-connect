import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TaxDetails, TaxDetailsInput } from '@/types/fiscal';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

export const useTaxDetails = (profileId?: string) => {
  const queryClient = useQueryClient();

  const { data: taxDetails, isLoading, error } = useQuery({
    queryKey: ['tax-details', profileId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const targetProfileId = profileId || user?.id;

      if (!targetProfileId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('tax_details')
        .select('*')
        .eq('profile_id', targetProfileId)
        .order('created_at', { ascending: false });

      if (error) {
        sreLogger.error('Error fetching tax details', { error, profileId: targetProfileId });
        throw error;
      }

      return data as TaxDetails[];
    },
    enabled: !!profileId || !!supabase.auth.getUser()
  });

  const createTaxDetails = useMutation({
    mutationFn: async (input: TaxDetailsInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('tax_details')
        .insert([{
          profile_id: user.id,
          country_code: input.country_code,
          entity_type: input.entity_type,
          tax_id: input.tax_id,
          vat_number: input.vat_number || null,
          address_line1: input.address_line1,
          address_line2: input.address_line2 || null,
          city: input.city,
          province: input.province || null,
          postal_code: input.postal_code,
          iban: input.iban,
          bic_swift: input.bic_swift || null,
          is_primary: true,
          valid_from: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        sreLogger.error('Error creating tax details', { error, input });
        throw error;
      }

      return data as TaxDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-details'] });
      toast.success('Dati fiscali salvati con successo');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore nel salvataggio dei dati fiscali');
    }
  });

  const updateTaxDetails = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaxDetailsInput> }) => {
      const { data: updatedData, error } = await supabase
        .from('tax_details')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        sreLogger.error('Error updating tax details', { error, id, data });
        throw error;
      }

      return updatedData as TaxDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-details'] });
      toast.success('Dati fiscali aggiornati con successo');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore nell\'aggiornamento dei dati fiscali');
    }
  });

  const setAsPrimary = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, set all existing tax details as non-primary
      await supabase
        .from('tax_details')
        .update({ is_primary: false })
        .eq('profile_id', user.id);

      // Then set the selected one as primary
      const { data, error } = await supabase
        .from('tax_details')
        .update({ is_primary: true })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        sreLogger.error('Error setting tax details as primary', { error, id });
        throw error;
      }

      return data as TaxDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-details'] });
      toast.success('Dati fiscali impostati come principali');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore nell\'impostazione dei dati principali');
    }
  });

  return {
    taxDetails,
    primaryTaxDetails: taxDetails?.find(td => td.is_primary),
    isLoading,
    error,
    createTaxDetails: createTaxDetails.mutateAsync,
    updateTaxDetails: updateTaxDetails.mutateAsync,
    setAsPrimary: setAsPrimary.mutateAsync,
    isCreating: createTaxDetails.isPending,
    isUpdating: updateTaxDetails.isPending
  };
};
