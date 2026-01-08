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
    console.log('[GENERATE-NON-FISCAL-RECEIPT] Processing:', booking_id);

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('*, spaces(*, profiles(*)), payments(*)')
      .eq('id', booking_id)
      .single();

    if (error || !booking) throw new Error('Booking not found');

    const host = booking.spaces.profiles;
    if (host.fiscal_regime !== 'privato') {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payment = booking.payments[0];
    const receiptNumber = `HO-${host.id.slice(0, 8)}-${Date.now()}`;

    const { data: receipt, error: recError } = await supabaseAdmin
      .from('non_fiscal_receipts')
      .insert({
        booking_id: booking.id,
        payment_id: payment.id,
        host_id: host.id,
        coworker_id: booking.user_id,
        receipt_number: receiptNumber,
        receipt_date: new Date().toISOString().split('T')[0],
        canone_amount: payment.host_amount,
        total_amount: payment.host_amount,
        pdf_url: `receipts/${receiptNumber}.pdf`
      })
      .select()
      .single();

    if (recError) throw recError;

    return new Response(JSON.stringify({ success: true, receipt_id: receipt.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[GENERATE-NON-FISCAL-RECEIPT] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});
