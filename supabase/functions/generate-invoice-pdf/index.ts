
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROVIDER_MODE = Deno.env.get('FISCAL_PROVIDER_MODE') || 'mock'; // 'mock' or 'provider'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { payment_id, booking_id, host_id, coworker_id } = await req.json();

    console.log('[INVOICE-PDF] Generating invoice', { payment_id, booking_id, PROVIDER_MODE });

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('amount, host_amount, platform_fee')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    // Get coworker details
    const { data: coworker } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', coworker_id)
      .single();

    // Generate invoice number (sequential per year)
    const year = new Date().getFullYear();
    const { count } = await supabaseClient
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .ilike('invoice_number', `WO-${year}-%`);

    const sequential = (count || 0) + 1;
    const invoiceNumber = `WO-${year}-${String(sequential).padStart(6, '0')}`;

    // Calculate amounts
    const baseAmount = payment.amount;
    const vatRate = 22;
    const vatAmount = (baseAmount * vatRate) / 100;
    const totalAmount = baseAmount + vatAmount;

    // MOCK MODE: Generate simple text-based PDF placeholder
    const pdfContent = `
FATTURA WORKOVER S.R.L.
Invoice: ${invoiceNumber}
Date: ${new Date().toISOString().split('T')[0]}

From: WorkOver S.r.l.
      Via Example 1, Milano, Italia
      P.IVA: IT12345678901

To: ${coworker?.first_name} ${coworker?.last_name}
    ${coworker?.email}

Services: Platform booking service
Base Amount: €${baseAmount.toFixed(2)}
VAT (${vatRate}%): €${vatAmount.toFixed(2)}
Total: €${totalAmount.toFixed(2)}

--- MOCK INVOICE - Not valid for fiscal purposes in MOCK mode ---
`;

    const encoder = new TextEncoder();
    const pdfBuffer = encoder.encode(pdfContent);

    // Upload to storage
    const filePath = `invoices/${year}/${invoiceNumber}.txt`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('fiscal-documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.error('[INVOICE-PDF] Upload error:', uploadError);
      throw new Error('Failed to upload invoice');
    }

    // Insert invoice record
    const { error: insertError } = await supabaseClient
      .from('invoices')
      .insert({
        payment_id,
        booking_id,
        recipient_id: coworker_id,
        recipient_type: 'coworker',
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        base_amount: baseAmount,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        pdf_file_url: uploadData?.path,
        xml_file_url: null, // NULL in MOCK mode
        issuer: 'WORKOVER_IT'
      });

    if (insertError) {
      console.error('[INVOICE-PDF] Insert error:', insertError);
      throw new Error('Failed to save invoice record');
    }

    console.log('[INVOICE-PDF] Invoice generated successfully', { invoiceNumber, mode: PROVIDER_MODE });

    return new Response(JSON.stringify({ 
      success: true,
      invoice_number: invoiceNumber,
      pdf_url: uploadData?.path,
      mode: PROVIDER_MODE
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[INVOICE-PDF] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
