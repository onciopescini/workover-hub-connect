
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROVIDER_MODE = Deno.env.get('FISCAL_PROVIDER_MODE') || 'mock';

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

    console.log('[RECEIPT-PDF] Generating non-fiscal receipt', { payment_id, booking_id, PROVIDER_MODE });

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('host_amount')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    // Get host and coworker details
    const { data: host } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', host_id)
      .single();

    const { data: coworker } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', coworker_id)
      .single();

    // Generate receipt number
    const year = new Date().getFullYear();
    const { count } = await supabaseClient
      .from('non_fiscal_receipts')
      .select('*', { count: 'exact', head: true })
      .ilike('receipt_number', `RIC-${year}-%`);

    const sequential = (count || 0) + 1;
    const receiptNumber = `RIC-${year}-${String(sequential).padStart(6, '0')}`;

    const canoneAmount = payment.host_amount || 0;

    // MOCK MODE: Generate simple text-based receipt
    const receiptContent = `
RICEVUTA NON FISCALE

Receipt: ${receiptNumber}
Date: ${new Date().toISOString().split('T')[0]}

From: ${host?.first_name} ${host?.last_name}
      ${host?.email}

To: ${coworker?.first_name} ${coworker?.last_name}

Services: Workspace rental
Canone Amount: €${canoneAmount.toFixed(2)}
Total: €${canoneAmount.toFixed(2)}

DISCLAIMER: Documento non valido ai fini fiscali, emesso esclusivamente 
per tracciabilità della transazione.

--- MOCK RECEIPT - Not valid for fiscal purposes ---
`;

    const encoder = new TextEncoder();
    const pdfBuffer = encoder.encode(receiptContent);

    // Upload to storage
    const filePath = `receipts/${year}/${receiptNumber}.txt`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('fiscal-documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.error('[RECEIPT-PDF] Upload error:', uploadError);
      throw new Error('Failed to upload receipt');
    }

    // Insert receipt record
    const { error: insertError } = await supabaseClient
      .from('non_fiscal_receipts')
      .insert({
        payment_id,
        booking_id,
        host_id,
        coworker_id,
        receipt_number: receiptNumber,
        receipt_date: new Date().toISOString().split('T')[0],
        canone_amount: canoneAmount,
        total_amount: canoneAmount,
        pdf_url: uploadData?.path,
        includes_coworker_cf: false
      });

    if (insertError) {
      console.error('[RECEIPT-PDF] Insert error:', insertError);
      throw new Error('Failed to save receipt record');
    }

    console.log('[RECEIPT-PDF] Receipt generated successfully', { receiptNumber, mode: PROVIDER_MODE });

    return new Response(JSON.stringify({ 
      success: true,
      receipt_number: receiptNumber,
      pdf_url: uploadData?.path,
      mode: PROVIDER_MODE
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[RECEIPT-PDF] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
