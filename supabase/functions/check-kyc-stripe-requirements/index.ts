import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('[check-kyc-stripe] Checking requirements for user:', user.id);

    // Fetch user profile with fiscal data
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_connected, fiscal_regime, pec_email, sdi_code, iban, tax_id, vat_number, legal_address, kyc_verified')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[check-kyc-stripe] Error fetching profile:', profileError);
      throw profileError;
    }

    console.log('[check-kyc-stripe] Profile data:', profile);

    const missing: string[] = [];
    const warnings: string[] = [];

    // Check Stripe connection
    if (!profile.stripe_connected) {
      missing.push('stripe_account');
    }

    // Check basic KYC fields
    if (!profile.iban || profile.iban.trim() === '') {
      missing.push('iban');
    }

    if (!profile.legal_address || profile.legal_address.trim() === '') {
      missing.push('legal_address');
    }

    // Check fiscal regime specific requirements
    if (profile.fiscal_regime === 'forfettario' || profile.fiscal_regime === 'ordinario') {
      // Business hosts need VAT number
      if (!profile.vat_number || profile.vat_number.trim() === '') {
        missing.push('vat_number');
      }

      // Need either PEC or SDI code
      if ((!profile.pec_email || profile.pec_email.trim() === '') && 
          (!profile.sdi_code || profile.sdi_code.trim() === '')) {
        missing.push('pec_or_sdi');
        warnings.push('È richiesta almeno una tra PEC o Codice SDI per la fatturazione elettronica');
      }
    } else if (profile.fiscal_regime === 'privato') {
      // Private hosts need tax ID (Codice Fiscale)
      if (!profile.tax_id || profile.tax_id.trim() === '') {
        missing.push('tax_id');
      }
    } else {
      // No fiscal regime set
      missing.push('fiscal_regime');
    }

    // Check if KYC is marked as verified
    if (!profile.kyc_verified) {
      warnings.push('I dati fiscali devono essere verificati da un amministratore prima di poter pubblicare spazi');
    }

    const canPublish = missing.length === 0 && profile.kyc_verified;

    console.log('[check-kyc-stripe] Requirements check result:', {
      canPublish,
      missing,
      warnings,
    });

    return new Response(
      JSON.stringify({
        success: true,
        can_publish: canPublish,
        missing_fields: missing,
        warnings: warnings,
        stripe_connected: profile.stripe_connected,
        kyc_verified: profile.kyc_verified,
        fiscal_regime: profile.fiscal_regime,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[check-kyc-stripe] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
