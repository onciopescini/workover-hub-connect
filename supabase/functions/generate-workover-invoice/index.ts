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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { booking_id } = await req.json();
    console.log('[GENERATE-WORKOVER-INVOICE] Processing:', booking_id);

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('*, spaces(*, profiles(*)), payments(*)')
      .eq('id', booking_id)
      .single();

    if (error || !booking) throw new Error('Booking not found');

    const payment = booking.payments[0];
    const serviceFee = payment.platform_fee || 0;
    const baseAmount = serviceFee / 1.22;
    const vatAmount = serviceFee - baseAmount;

    const year = new Date().getFullYear();
    const { count } = await supabaseAdmin
      .from('invoices')
      .select('id', { count: 'exact', head: true });
    
    const invoiceNumber = `WF-${year}-${String((count || 0) + 1).padStart(5, '0')}`;

    const { data: invoice, error: invError } = await supabaseAdmin
      .from('invoices')
      .insert({
        payment_id: payment.id,
        booking_id: booking.id,
        recipient_id: booking.spaces.host_id,
        recipient_type: booking.spaces.profiles.fiscal_regime === 'privato' ? 'host_privato' : 'host_piva',
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        base_amount: baseAmount,
        vat_amount: vatAmount,
        total_amount: serviceFee
      })
      .select()
      .single();

    if (invError) throw invError;

    await supabaseAdmin.from('payments').update({ workover_invoice_id: invoice.id }).eq('id', payment.id);

    return new Response(JSON.stringify({ success: true, invoice_id: invoice.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[GENERATE-WORKOVER-INVOICE] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});
