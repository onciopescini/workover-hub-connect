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
      country_code: providedCountryCode,
      fiscal_regime,
      legal_address,
      is_primary
    } = body;

    // Derive entity_type from fiscal_regime if not provided
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

    // Derive country_code from IBAN if not provided
    let country_code = providedCountryCode;
    if (!country_code && iban) {
      const ibanClean = iban.replace(/\s/g, '').toUpperCase();
      if (ibanClean.startsWith('IT')) {
        country_code = 'IT';
      }
    }

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

    if (errors.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if tax_details record exists
    const { data: existingTaxDetails } = await supabase
      .from('tax_details')
      .select('id')
      .eq('profile_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    // Determine effective address_line1
    const effectiveAddressLine1 = address_line1 || legal_address;

    let result: any = null;
    let taxDetailsSkipped = false;

    if (existingTaxDetails) {
      // UPDATE existing record with available fields
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (entity_type) updateData.entity_type = entity_type;
      if (iban !== undefined) updateData.iban = iban;
      if (vat_number !== undefined) updateData.vat_number = vat_number;
      if (tax_id !== undefined) updateData.tax_id = tax_id;
      if (bic_swift !== undefined) updateData.bic_swift = bic_swift;
      if (effectiveAddressLine1 !== undefined) updateData.address_line1 = effectiveAddressLine1;
      if (address_line2 !== undefined) updateData.address_line2 = address_line2;
      if (city !== undefined) updateData.city = city;
      if (province !== undefined) updateData.province = province;
      if (postal_code !== undefined) updateData.postal_code = postal_code;
      if (country_code !== undefined) updateData.country_code = country_code;

      result = await supabase
        .from('tax_details')
        .update(updateData)
        .eq('id', existingTaxDetails.id)
        .select()
        .single();

      if (result.error) {
        console.error('Tax details update error:', result.error);
        return new Response(JSON.stringify({ 
          error: 'Failed to update tax details',
          details: result.error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('Tax details updated successfully:', { userId: user.id, taxDetailsId: result.data.id });
    } else {
      // Check if we have all required fields for INSERT
      const hasRequiredForInsert = !!(
        effectiveAddressLine1 &&
        city &&
        postal_code &&
        country_code &&
        entity_type &&
        tax_id &&
        iban
      );

      if (hasRequiredForInsert) {
        // INSERT new record
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
          is_primary: is_primary ?? true,
          updated_at: new Date().toISOString()
        };

        result = await supabase
          .from('tax_details')
          .insert(insertData)
          .select()
          .single();

        if (result.error) {
          console.error('Tax details insert error:', result.error);
          return new Response(JSON.stringify({ 
            error: 'Failed to create tax details',
            details: result.error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log('Tax details created successfully:', { userId: user.id, taxDetailsId: result.data.id });
      } else {
        // Skip tax_details insert - missing required fields
        const missingFields = [];
        if (!effectiveAddressLine1) missingFields.push('address_line1');
        if (!city) missingFields.push('city');
        if (!postal_code) missingFields.push('postal_code');
        if (!country_code) missingFields.push('country_code');
        if (!entity_type) missingFields.push('entity_type');
        if (!tax_id) missingFields.push('tax_id');
        if (!iban) missingFields.push('iban');

        console.log('Skipping tax_details insert due to missing required fields:', missingFields);
        taxDetailsSkipped = true;
      }
    }

    // ALWAYS sync to profiles table with available fields
    const profileUpdateData: any = {};
    if (fiscal_regime !== undefined) profileUpdateData.fiscal_regime = fiscal_regime;
    if (iban !== undefined) profileUpdateData.iban = iban;
    if (tax_id !== undefined) profileUpdateData.tax_id = tax_id;
    if (vat_number !== undefined) profileUpdateData.vat_number = vat_number;
    if (pec_email !== undefined) profileUpdateData.pec_email = pec_email;
    if (sdi_code !== undefined) profileUpdateData.sdi_code = sdi_code;
    if (legal_address !== undefined) profileUpdateData.legal_address = legal_address;

    // UPDATE profiles only if there are fields to sync
    if (Object.keys(profileUpdateData).length > 0) {
      profileUpdateData.updated_at = new Date().toISOString();
      
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', user.id);
      
      if (profileUpdateError) {
        console.error('Warning: Failed to sync profiles', profileUpdateError);
        // Don't block the flow, continue anyway
      } else {
        console.log('Profiles synced successfully', { userId: user.id });
      }
    }

    // Return appropriate response
    if (taxDetailsSkipped) {
      return new Response(JSON.stringify({ 
        success: true,
        partial: true,
        message: 'Tax details not created yet. Saved to profile only. Complete address and entity information required for full tax details.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      data: result?.data || null
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
