
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const { booking_id, cancelled_by_host } = await req.json();

    console.log('[PROCESS-REFUND] Starting refund', { booking_id, cancelled_by_host });

    // Get payment for this booking
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('id, amount, stripe_session_id, bookings(cancellation_fee)')
      .eq('booking_id', booking_id)
      .eq('payment_status', 'completed')
      .single();

    if (paymentError || !payment) {
      console.error('[PROCESS-REFUND] Payment not found or not completed');
      return new Response(JSON.stringify({ error: 'Payment not found or not completed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Calculate refund amount
    let refundAmount: number;
    
    if (cancelled_by_host) {
      // Host cancels: 100% refund
      refundAmount = payment.amount;
      console.log('[PROCESS-REFUND] Host cancellation - full refund', { refundAmount });
    } else {
      // Coworker cancels: amount - cancellation_fee
      const cancellationFee = (payment.bookings as any)?.cancellation_fee || 0;
      refundAmount = payment.amount - cancellationFee;
      console.log('[PROCESS-REFUND] Coworker cancellation - partial refund', { 
        refundAmount, 
        cancellationFee 
      });
    }

    // Ensure positive refund amount
    if (refundAmount <= 0) {
      console.log('[PROCESS-REFUND] No refund due (amount <= 0)');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No refund due',
        refund_amount: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Create Stripe refund
    const refundAmountCents = Math.round(refundAmount * 100);
    
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_session_id,
      amount: refundAmountCents,
      reason: cancelled_by_host ? 'requested_by_customer' : 'requested_by_customer',
      metadata: {
        booking_id,
        cancelled_by_host: String(cancelled_by_host)
      }
    });

    console.log('[PROCESS-REFUND] Stripe refund created', { 
      refundId: refund.id,
      amount: refundAmount
    });

    // Update payment status to refund_pending (will be updated to 'refunded' by webhook)
    await supabaseClient
      .from('payments')
      .update({ 
        payment_status: 'refund_pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    return new Response(JSON.stringify({ 
      success: true,
      refund_id: refund.id,
      refund_amount: refundAmount,
      status: 'refund_pending'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[PROCESS-REFUND] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
