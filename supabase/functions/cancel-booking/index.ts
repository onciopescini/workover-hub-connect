import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { corsHeaders } from "../_shared/cors.ts";
import { calculateRefund } from "../_shared/policy-calculator.ts";

console.log("Hello from cancel-booking!");

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    // Create a client with the user's token to get the user
    const supabaseAuthClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const { booking_id, reason } = await req.json();

    if (!booking_id) {
      throw new Error("Missing booking_id");
    }

    console.log(`[cancel-booking] Processing cancellation for booking: ${booking_id}, user: ${user.id}`);

    // 1. Fetch Booking and Payment Details
    // CRITICAL: We now use booking.cancellation_policy, NOT workspace policy.
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        payments (
          id,
          amount,
          stripe_payment_intent_id,
          payment_status
        )
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error("[cancel-booking] Booking not found:", bookingError);
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Determine host_id (we still need to know who the host is for permission check)
    // We can fetch it from workspaces briefly, or trust the frontend? No, must verify.
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('workspaces')
      .select('host_id')
      .eq('id', booking.space_id)
      .single();

    if (workspaceError) {
      console.error("[cancel-booking] Workspace not found for auth check:", workspaceError);
      // Proceeding might be risky if we can't verify host, but user.id == booking.user_id is safe.
    }

    // Security Check: Verify User is Guest or Host
    const isGuest = booking.user_id === user.id;
    const isHost = workspace?.host_id === user.id;

    if (!isGuest && !isHost) {
       return new Response(JSON.stringify({ error: 'Unauthorized: You are not the guest or host of this booking' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const cancelled_by_host = isHost;

    // SNAPSHOT: Use the policy stored on the booking. Fallback to moderate if missing (old booking pre-backfill? shouldn't happen)
    const cancellationPolicy = booking.cancellation_policy || 'moderate';

    // Find the successful payment
    const payment = booking.payments?.find((p: any) => p.payment_status === 'completed');
    const paymentIntentId = payment?.stripe_payment_intent_id || booking.stripe_payment_intent_id;
    const grossAmount = payment?.amount || 0; // This is in cents usually? Or whatever database stores. Assuming matches Stripe unit.

    console.log(`[cancel-booking] Found payment: ${payment?.id}, Amount: ${grossAmount}, PI: ${paymentIntentId}, Policy: ${cancellationPolicy}`);

    // 2. Calculate Refund Amount using Shared Logic
    let refundAmount = 0;
    let cancellationFee = 0;

    if (cancelled_by_host) {
      // Host cancels -> 100% refund
      refundAmount = grossAmount;
      cancellationFee = 0;
      console.log(`[cancel-booking] Host cancellation. Full refund: ${refundAmount}`);
    } else {
      // Guest cancels -> Use Calculator
      const bookingDateStr = booking.booking_date; // "YYYY-MM-DD"
      const startTimeStr = booking.start_time || "00:00:00";
      // Construct UTC-ish date for calculation (Relative difference matters most)
      // Ideally we parse timezone. But the calculator uses standard JS Date.
      // We will construct Date objects.
      const bookingDateTime = new Date(`${bookingDateStr}T${startTimeStr}`);
      const now = new Date();

      const result = calculateRefund(grossAmount, cancellationPolicy, bookingDateTime, now);
      refundAmount = result.refundAmount;
      cancellationFee = result.penaltyAmount;

      console.log(`[cancel-booking] Calculator Result:`, result);
    }

    // 3. Execute Stripe Refund (if applicable) - ATOMIC
    let refundId = null;

    if (paymentIntentId && refundAmount > 0) {
      try {
        // Ensure integer cents
        const refundAmountCents = Math.round(refundAmount);

        if (refundAmountCents > 0) {
           const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: refundAmountCents,
            reason: cancelled_by_host ? 'requested_by_customer' : 'requested_by_customer',
            metadata: {
              booking_id: booking_id,
              initiated_by: cancelled_by_host ? 'host' : 'guest',
              policy_applied: cancellationPolicy
            }
          });
          refundId = refund.id;
          console.log(`[cancel-booking] Stripe refund successful: ${refundId}`);
        }
      } catch (stripeError: any) {
        console.error("[cancel-booking] Stripe refund failed:", stripeError);
        // CRITICAL: Atomic Failure.
        // Return 400 and do NOT update the DB.
        return new Response(JSON.stringify({
          error: 'Refund processing failed. The booking has NOT been cancelled. Please try again.',
          details: stripeError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400, // Client error (logic valid, but payment gateway rejected) or 500? 400 is safer for UI feedback.
        });
      }
    } else if (!paymentIntentId && refundAmount > 0) {
        // If we calculated a refund but have no way to refund it (no payment intent), what do we do?
        // Usually log a warning. For now, we proceed to cancel but cannot refund automatically.
        console.warn("[cancel-booking] Refund calculated but no Payment Intent found. Manual refund required.");
    }

    // 4. Update DB (Only reached if refund succeeded or wasn't needed)
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_host: cancelled_by_host,
        cancellation_fee: cancellationFee,
        cancellation_reason: reason || (cancelled_by_host ? 'Host initiated' : 'User initiated')
      })
      .eq('id', booking_id);

    if (updateError) {
      throw new Error(`Failed to update booking status: ${updateError.message}`);
    }

    // Update payment status if refund was issued
    if (refundId && payment) {
      await supabaseClient
        .from('payments')
        .update({
          payment_status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);
    }

    return new Response(JSON.stringify({
      success: true,
      refund_amount: refundAmount,
      cancellation_fee: cancellationFee,
      refund_id: refundId,
      message: refundId ? 'Cancellation and refund successful' : 'Cancellation successful'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[cancel-booking] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
