import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaxDetailsUpdate {
  fiscal_regime?: 'privato' | 'forfettario' | 'ordinario';
  tax_id?: string;
  vat_number?: string;
  pec_email?: string;
  sdi_code?: string;
  iban?: string;
  legal_address?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const taxDetails: TaxDetailsUpdate = await req.json();

    console.log('[update-tax-details] Updating tax details for user:', user.id);

    // Validation
    const errors: string[] = [];

    if (taxDetails.fiscal_regime) {
      if (!['privato', 'forfettario', 'ordinario'].includes(taxDetails.fiscal_regime)) {
        errors.push('Regime fiscale non valido');
      }
    }

    if (taxDetails.tax_id && !/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(taxDetails.tax_id)) {
      errors.push('Codice Fiscale non valido');
    }

    if (taxDetails.vat_number && !/^\d{11}$/.test(taxDetails.vat_number)) {
      errors.push('Partita IVA non valida (deve essere 11 cifre)');
    }

    if (taxDetails.pec_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(taxDetails.pec_email)) {
      errors.push('PEC email non valida');
    }

    if (taxDetails.sdi_code && !/^[A-Z0-9]{7}$/.test(taxDetails.sdi_code)) {
      errors.push('Codice SDI non valido (deve essere 7 caratteri alfanumerici)');
    }

    if (taxDetails.iban && !/^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/.test(taxDetails.iban.replace(/\s/g, ''))) {
      errors.push('IBAN italiano non valido');
    }

    if (errors.length > 0) {
      console.warn('[update-tax-details] Validation errors:', errors);
      return new Response(
        JSON.stringify({
          success: false,
          errors: errors,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (taxDetails.fiscal_regime !== undefined) updateData.fiscal_regime = taxDetails.fiscal_regime;
    if (taxDetails.tax_id !== undefined) updateData.tax_id = taxDetails.tax_id;
    if (taxDetails.vat_number !== undefined) updateData.vat_number = taxDetails.vat_number;
    if (taxDetails.pec_email !== undefined) updateData.pec_email = taxDetails.pec_email;
    if (taxDetails.sdi_code !== undefined) updateData.sdi_code = taxDetails.sdi_code;
    if (taxDetails.iban !== undefined) updateData.iban = taxDetails.iban?.replace(/\s/g, '');
    if (taxDetails.legal_address !== undefined) updateData.legal_address = taxDetails.legal_address;

    // Reset KYC verification when tax details change (requires re-verification)
    updateData.kyc_verified = false;
    updateData.kyc_verified_at = null;
    updateData.kyc_verified_by = null;

    // Update profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('[update-tax-details] Error updating profile:', updateError);
      throw updateError;
    }

    console.log('[update-tax-details] Tax details updated successfully');

    // Create notification
    await supabaseClient
      .from('user_notifications')
      .insert({
        user_id: user.id,
        type: 'system',
        title: 'Dati Fiscali Aggiornati',
        content: 'I tuoi dati fiscali sono stati aggiornati. Un amministratore li verificherà a breve.',
        metadata: {
          fields_updated: Object.keys(taxDetails),
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tax details updated successfully. Awaiting admin verification.',
        kyc_verification_required: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[update-tax-details] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
