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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const {
      tax_id,
      vat_number,
      entity_type,
      iban,
      bic_swift,
      pec_email,
      sdi_code,
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
      country_code,
      fiscal_regime,
      is_primary
    } = body;

    // VALIDAZIONE SERVER-SIDE
    const errors: string[] = [];

    // Validazione P.IVA italiana (11 cifre)
    if (vat_number) {
      if (!/^\d{11}$/.test(vat_number)) {
        errors.push('P.IVA deve essere di 11 cifre');
      }
    }

    // Validazione Codice Fiscale italiano (16 caratteri alfanumerici)
    if (tax_id && entity_type === 'individual') {
      if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(tax_id)) {
        errors.push('Codice Fiscale non valido (formato: RSSMRA80A01H501U)');
      }
    }

    // Validazione IBAN base (formato: IT60X0542811101000000123456)
    if (iban) {
      const ibanClean = iban.replace(/\s/g, '').toUpperCase();
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(ibanClean)) {
        errors.push('IBAN non valido (formato errato)');
      }
      // Basic length check for Italian IBAN
      if (ibanClean.startsWith('IT') && ibanClean.length !== 27) {
        errors.push('IBAN italiano deve essere di 27 caratteri');
      }
    }

    // Validazione PEC (deve contenere @pec o @legalmail o @cert)
    if (pec_email) {
      const pecDomainRegex = /@(pec\.|legalmail\.|cert\.)/i;
      if (!pecDomainRegex.test(pec_email)) {
        errors.push('PEC non valida (deve essere dominio @pec.*, @legalmail.*, @cert.*)');
      }
      // Basic email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pec_email)) {
        errors.push('PEC formato email non valido');
      }
    }

    // Validazione SDI (7 caratteri alfanumerici)
    if (sdi_code) {
      if (!/^[A-Z0-9]{7}$/i.test(sdi_code)) {
        errors.push('Codice SDI deve essere di 7 caratteri alfanumerici (es: ABCDE12)');
      }
    }

    // Validazione campi obbligatori per DAC7
    if (is_primary) {
      if (!address_line1 || !city || !postal_code || !country_code) {
        errors.push('Indirizzo completo obbligatorio per dati fiscali primari');
      }
      if (!iban) {
        errors.push('IBAN obbligatorio per dati fiscali primari');
      }
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // UPSERT tax_details
    const { data: existingTaxDetails } = await supabase
      .from('tax_details')
      .select('id')
      .eq('profile_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    const taxDetailsData = {
      profile_id: user.id,
      tax_id,
      vat_number,
      entity_type,
      iban,
      bic_swift,
      pec_email,
      sdi_code,
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
      country_code,
      is_primary: is_primary ?? true,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingTaxDetails) {
      result = await supabase
        .from('tax_details')
        .update(taxDetailsData)
        .eq('id', existingTaxDetails.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('tax_details')
        .insert(taxDetailsData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Tax details save error:', result.error);
      return new Response(JSON.stringify({ 
        error: 'Failed to save tax details',
        details: result.error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Tax details saved successfully:', { userId: user.id, taxDetailsId: result.data.id });

    // FASE 1: Sync profiles table with tax_details for backward compatibility
    const profileUpdateData: any = {};
    if (fiscal_regime !== undefined) profileUpdateData.fiscal_regime = fiscal_regime;
    if (iban !== undefined) profileUpdateData.iban = iban;
    if (tax_id !== undefined) profileUpdateData.tax_id = tax_id;
    if (vat_number !== undefined) profileUpdateData.vat_number = vat_number;
    if (pec_email !== undefined) profileUpdateData.pec_email = pec_email;
    if (sdi_code !== undefined) profileUpdateData.sdi_code = sdi_code;

    // UPDATE profiles only if there are fields to sync
    if (Object.keys(profileUpdateData).length > 0) {
      profileUpdateData.updated_at = new Date().toISOString();
      
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', user.id);
      
      if (profileUpdateError) {
        console.error('Warning: Failed to sync profiles', profileUpdateError);
        // Don't block the flow, tax_details is the SSOT
      } else {
        console.log('Profiles synced successfully', { userId: user.id });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: result.data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in update-tax-details:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
