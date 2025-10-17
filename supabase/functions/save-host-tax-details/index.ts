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
      entity_type: providedEntityType,
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
      legal_address,
      is_primary
    } = body;

    // Derive entity_type from fiscal_regime
    let entity_type = providedEntityType;
    if (!entity_type && fiscal_regime) {
      switch (fiscal_regime) {
        case 'privato':
          entity_type = 'individual';
          break;
        case 'forfettario':
          entity_type = 'freelance';
          break;
        case 'ordinario':
          entity_type = 'business';
          break;
        default:
          entity_type = 'individual';
      }
    }

    // SERVER-SIDE VALIDATION
    const errors: string[] = [];

    // Validate Italian P.IVA (11 digits)
    if (vat_number) {
      if (!/^\d{11}$/.test(vat_number)) {
        errors.push('P.IVA deve essere di 11 cifre');
      }
    }

    // Validate Italian Codice Fiscale (16 alphanumeric)
    if (tax_id && entity_type === 'individual') {
      if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(tax_id)) {
        errors.push('Codice Fiscale non valido (formato: RSSMRA80A01H501U)');
      }
    }

    // Validate IBAN (Italian format: IT + 25 chars = 27 total)
    if (iban) {
      const ibanClean = iban.replace(/\s/g, '').toUpperCase();
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(ibanClean)) {
        errors.push('IBAN non valido (formato errato)');
      }
      if (ibanClean.startsWith('IT') && ibanClean.length !== 27) {
        errors.push('IBAN italiano deve essere di 27 caratteri');
      }
    }

    // Validate PEC email
    if (pec_email) {
      const pecDomainRegex = /@(pec\.|legalmail\.|cert\.)/i;
      if (!pecDomainRegex.test(pec_email)) {
        errors.push('PEC non valida (deve essere dominio @pec.*, @legalmail.*, @cert.*)');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pec_email)) {
        errors.push('PEC formato email non valido');
      }
    }

    // Validate SDI code (7 alphanumeric)
    if (sdi_code) {
      if (!/^[A-Z0-9]{7}$/i.test(sdi_code)) {
        errors.push('Codice SDI deve essere di 7 caratteri alfanumerici (es: ABCDE12)');
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

    // Determine effective address
    const effectiveAddressLine1 = address_line1 || legal_address;

    // Check required fields for tax_details
    const hasRequiredFields = !!(
      effectiveAddressLine1 &&
      city &&
      postal_code &&
      country_code &&
      entity_type &&
      tax_id &&
      iban
    );

    if (!hasRequiredFields) {
      const missingFields = [];
      if (!effectiveAddressLine1) missingFields.push('address_line1');
      if (!city) missingFields.push('city');
      if (!postal_code) missingFields.push('postal_code');
      if (!country_code) missingFields.push('country_code');
      if (!entity_type) missingFields.push('entity_type');
      if (!tax_id) missingFields.push('tax_id');
      if (!iban) missingFields.push('iban');

      return new Response(JSON.stringify({ 
        success: false,
        partial: true,
        error: 'Dati fiscali incompleti. Campi mancanti: ' + missingFields.join(', '),
        missingFields
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if existing primary tax_details exists
    const { data: existingTaxDetails } = await supabase
      .from('tax_details')
      .select('id')
      .eq('profile_id', user.id)
      .eq('is_primary', true)
      .is('valid_to', null)
      .maybeSingle();

    let taxDetailsId: string;
    let isFirstTime = !existingTaxDetails;

    if (existingTaxDetails) {
      // INVALIDATE previous primary record
      const { error: invalidateError } = await supabase
        .from('tax_details')
        .update({ 
          valid_to: new Date().toISOString(),
          is_primary: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTaxDetails.id);

      if (invalidateError) {
        console.error('Error invalidating previous tax_details:', invalidateError);
      }
    }

    // INSERT new tax_details record as primary
    const insertData = {
      profile_id: user.id,
      tax_id,
      vat_number,
      entity_type,
      iban,
      bic_swift,
      address_line1: effectiveAddressLine1,
      address_line2,
      city,
      province,
      postal_code,
      country_code,
      is_primary: true,
      valid_from: new Date().toISOString(),
      valid_to: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newTaxDetails, error: insertError } = await supabase
      .from('tax_details')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Tax details insert error:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create tax details',
        details: insertError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    taxDetailsId = newTaxDetails.id;
    console.log('Tax details created successfully:', { userId: user.id, taxDetailsId });

    // UPDATE profiles table
    const profileUpdateData: any = {
      updated_at: new Date().toISOString()
    };
    if (fiscal_regime !== undefined) profileUpdateData.fiscal_regime = fiscal_regime;
    if (iban !== undefined) profileUpdateData.iban = iban;
    if (tax_id !== undefined) profileUpdateData.tax_id = tax_id;
    if (vat_number !== undefined) profileUpdateData.vat_number = vat_number;
    if (pec_email !== undefined) profileUpdateData.pec_email = pec_email;
    if (sdi_code !== undefined) profileUpdateData.sdi_code = sdi_code;
    if (legal_address !== undefined) profileUpdateData.legal_address = legal_address;

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', user.id);
    
    if (profileUpdateError) {
      console.error('Warning: Failed to sync profiles', profileUpdateError);
    } else {
      console.log('Profiles synced successfully', { userId: user.id });
    }

    // NOTIFY ADMIN for review
    const { data: adminProfiles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminProfiles && adminProfiles.length > 0) {
      const adminNotifications = adminProfiles.map(admin => ({
        user_id: admin.user_id,
        type: 'fiscal_review',
        title: isFirstTime ? '🔍 Nuovi Dati Fiscali da Verificare' : '🔄 Dati Fiscali Aggiornati',
        content: `L'host ${user.email} ha ${isFirstTime ? 'inserito' : 'aggiornato'} i propri dati fiscali. Verifica richiesta.`,
        metadata: {
          host_id: user.id,
          host_email: user.email,
          tax_details_id: taxDetailsId,
          fiscal_regime,
          entity_type,
          is_first_submission: isFirstTime
        }
      }));

      const { error: notifError } = await supabase
        .from('user_notifications')
        .insert(adminNotifications);

      if (notifError) {
        console.error('Warning: Failed to notify admins', notifError);
      } else {
        console.log('Admin notifications sent successfully', { count: adminNotifications.length });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: {
        tax_details_id: taxDetailsId,
        is_first_time: isFirstTime
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in save-host-tax-details:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
