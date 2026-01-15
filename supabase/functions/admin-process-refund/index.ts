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
      user_id: user.id,
    });

    if (adminCheckError || !isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    // 2. Parse Request
    const { disputeId } = await req.json();
    if (!disputeId) {
      throw new Error('Missing disputeId');
    }

    // 3. Fetch Data
    // Get Dispute -> Booking ID
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

    const bookingId = dispute.booking_id;

    // Get Payment Record
    // We look for a successful payment for this booking
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('stripe_payment_intent_id, amount, payment_status, id')
      .eq('booking_id', bookingId)
      .in('payment_status', ['succeeded', 'paid']) // Check for valid success statuses
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

    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        reason: 'requested_by_customer', // Mapping 'dispute' to 'requested_by_customer' is safe generic
        metadata: {
          dispute_id: disputeId,
          booking_id: bookingId,
          performed_by: user.id
        }
      });
      console.log('Stripe refund successful:', refund.id);
    } catch (stripeError: any) {
      console.error('Stripe Refund Error:', stripeError);
      // If it says "charge already refunded", we can proceed to update DB.
      if (stripeError.code === 'charge_already_refunded') {
         console.log('Charge was already refunded in Stripe. Proceeding to update DB.');
      } else {
         throw new Error(`Stripe Refund Failed: ${stripeError.message}`);
      }
    }

    // 5. DB Updates
    // Update Dispute
    const { error: updateDisputeError } = await supabaseAdmin
      .from('disputes')
      .update({ status: 'refunded' })
      .eq('id', disputeId);

    if (updateDisputeError) {
      console.error('Error updating dispute status:', updateDisputeError);
      throw new Error('Failed to update dispute status');
    }

    // Update Booking
    const { error: updateBookingError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (updateBookingError) {
       console.error('Error updating booking status:', updateBookingError);
    }

    // Update Payment
    const { error: updatePaymentError } = await supabaseAdmin
      .from('payments')
      .update({ payment_status: 'refunded' })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('Error updating payment status:', updatePaymentError);
    }

    // Trigger Notification
    try {
      console.log('Invoking send-booking-notification (refund)...');
      const { error: notifError } = await supabaseAdmin.functions.invoke('send-booking-notification', {
        body: { booking_id: bookingId, type: 'refund' }
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
