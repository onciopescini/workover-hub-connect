import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Hello from admin-process-refund!");

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Auth Check
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Initialize Admin Client for DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify Admin Role
    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc('is_admin', {
      p_user_id: user.id,
    });

    if (adminCheckError || !isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    // 2. Parse Request - Support both disputeId and direct bookingId
    const { disputeId, bookingId, refundType, amount, reason } = await req.json();
    
    let targetBookingId: string;
    let disputeToUpdate: string | null = null;

    if (disputeId) {
      // Existing dispute-based flow
      const { data: dispute, error: disputeError } = await supabaseAdmin
        .from('disputes')
        .select('booking_id, status')
        .eq('id', disputeId)
        .single();

      if (disputeError || !dispute) {
        throw new Error('Dispute not found');
      }

      if (dispute.status === 'refunded') {
        throw new Error('Dispute is already refunded');
      }

      targetBookingId = dispute.booking_id;
      disputeToUpdate = disputeId;
    } else if (bookingId) {
      // Direct booking refund (no dispute required)
      targetBookingId = bookingId;
    } else {
      throw new Error('Either disputeId or bookingId is required');
    }

    // 3. Get Payment Record for this booking
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('stripe_payment_intent_id, amount, payment_status, id')
      .eq('booking_id', targetBookingId)
      .in('payment_status', ['succeeded', 'paid'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentError || !payment) {
      console.error('Payment fetch error or not found:', paymentError);
      throw new Error('No successful payment record found for this booking');
    }

    if (!payment.stripe_payment_intent_id) {
      throw new Error('Payment record exists but missing Stripe Payment Intent ID');
    }

    // 4. Stripe Refund
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    console.log(`Attempting refund for PaymentIntent: ${payment.stripe_payment_intent_id}`);

    // Determine refund amount (full or partial)
    const refundOptions: any = {
      payment_intent: payment.stripe_payment_intent_id,
      reason: 'requested_by_customer',
      metadata: {
        dispute_id: disputeToUpdate || 'none',
        booking_id: targetBookingId,
        performed_by: user.id,
        refund_type: refundType || 'full',
        admin_reason: reason || 'Admin refund'
      }
    };

    // For partial refunds, add amount in cents
    if (refundType === 'partial' && amount) {
      refundOptions.amount = amount;
      console.log(`Partial refund requested: ${amount} cents`);
    }

    try {
      const refund = await stripe.refunds.create(refundOptions);
      console.log('Stripe refund successful:', refund.id, 'Amount:', refund.amount);
    } catch (stripeError: any) {
      console.error('Stripe Refund Error:', stripeError);
      if (stripeError.code === 'charge_already_refunded') {
        console.log('Charge was already refunded in Stripe. Proceeding to update DB.');
      } else {
        throw new Error(`Stripe Refund Failed: ${stripeError.message}`);
      }
    }

    // 5. DB Updates
    // Update Dispute (only if there was one)
    if (disputeToUpdate) {
      const { error: updateDisputeError } = await supabaseAdmin
        .from('disputes')
        .update({ status: 'refunded' })
        .eq('id', disputeToUpdate);

      if (updateDisputeError) {
        console.error('Error updating dispute status:', updateDisputeError);
      }
    }

    // Update Booking status
    const newBookingStatus = refundType === 'partial' ? 'refunded' : 'cancelled';
    const { error: updateBookingError } = await supabaseAdmin
      .from('bookings')
      .update({ status: newBookingStatus })
      .eq('id', targetBookingId);

    if (updateBookingError) {
      console.error('Error updating booking status:', updateBookingError);
    }

    // Update Payment status
    const { error: updatePaymentError } = await supabaseAdmin
      .from('payments')
      .update({ payment_status: 'refunded' })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('Error updating payment status:', updatePaymentError);
    }

    // Log admin action
    await supabaseAdmin
      .from('admin_actions_log')
      .insert({
        admin_id: user.id,
        action_type: 'refund_processed',
        target_type: 'booking',
        target_id: targetBookingId,
        description: `${refundType === 'partial' ? 'Partial' : 'Full'} refund processed for booking`,
        metadata: {
          payment_id: payment.id,
          dispute_id: disputeToUpdate,
          refund_type: refundType || 'full',
          amount: amount,
          reason: reason
        }
      });

    // Trigger Notification
    try {
      console.log('Invoking send-booking-notification (refund)...');
      const { error: notifError } = await supabaseAdmin.functions.invoke('send-booking-notification', {
        body: { booking_id: targetBookingId, type: 'refund' }
      });
      if (notifError) console.error('Notification Error:', notifError);
    } catch (e) {
      console.error('Notification Exception:', e);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Refund processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing refund:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
