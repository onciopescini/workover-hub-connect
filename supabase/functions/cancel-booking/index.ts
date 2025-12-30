import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { corsHeaders } from "../_shared/cors.ts";

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

    // 1. Fetch Booking, Payment, and Workspace Details
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

    // Fetch workspace details separately
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('workspaces')
      .select('cancellation_policy, title, host_id')
      .eq('id', booking.space_id)
      .single();

    if (workspaceError) {
      console.error("[cancel-booking] Workspace not found:", workspaceError);
    }

    // Security Check: Verify User is Guest or Host
    const isGuest = booking.user_id === user.id;
    const isHost = workspace?.host_id === user.id;

    if (!isGuest && !isHost) {
      // Check if user is admin (optional, assuming no 'admin' role check here for simplicity unless needed)
      // Ideally we check roles but 'isGuest' or 'isHost' covers standard flows.
       return new Response(JSON.stringify({ error: 'Unauthorized: You are not the guest or host of this booking' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Determine who is cancelling for logic purposes
    const cancelled_by_host = isHost;

    const cancellationPolicy = workspace?.cancellation_policy || 'moderate';

    // Find the successful payment
    const payment = booking.payments?.find((p: any) => p.payment_status === 'completed');
    const paymentIntentId = payment?.stripe_payment_intent_id || booking.stripe_payment_intent_id;
    const grossAmount = payment?.amount || 0;

    console.log(`[cancel-booking] Found payment: ${payment?.id}, Amount: ${grossAmount}, PI: ${paymentIntentId}`);

    // 2. Calculate Refund Amount
    let refundAmount = 0;
    let cancellationFee = 0;

    if (cancelled_by_host) {
      // Host cancels -> 100% refund
      refundAmount = grossAmount;
      console.log(`[cancel-booking] Host cancellation. Full refund: ${refundAmount}`);
    } else {
      // Guest cancels -> Apply Policy
      const bookingDateStr = booking.booking_date; // "YYYY-MM-DD"
      const startTimeStr = booking.start_time || "00:00:00";
      const bookingDateTime = new Date(`${bookingDateStr}T${startTimeStr}`);
      const now = new Date();

      const diffMs = bookingDateTime.getTime() - now.getTime();
      const hoursRemaining = diffMs / (1000 * 60 * 60);
      const daysRemaining = hoursRemaining / 24;

      console.log(`[cancel-booking] Time remaining: ${hoursRemaining.toFixed(2)} hours (${daysRemaining.toFixed(2)} days). Policy: ${cancellationPolicy}`);

      if (daysRemaining < 0) {
         // Booking already started/past
         refundAmount = 0;
         console.log("[cancel-booking] Booking started. No refund.");
      } else {
        switch (cancellationPolicy) {
          case 'flexible':
            // Full refund until 24h before
            if (hoursRemaining >= 24) {
              refundAmount = grossAmount;
            } else {
              refundAmount = 0;
            }
            break;

          case 'moderate':
            // Full refund until 5 days, 50% until 24h
            if (daysRemaining >= 5) {
              refundAmount = grossAmount;
            } else if (hoursRemaining >= 24) {
              refundAmount = grossAmount * 0.5;
            } else {
              refundAmount = 0;
            }
            break;

          case 'strict':
             // 50% until 7 days
             if (daysRemaining >= 7) {
               refundAmount = grossAmount * 0.5;
             } else {
               refundAmount = 0;
             }
             break;

          default:
            refundAmount = 0;
        }
      }
    }

    cancellationFee = grossAmount - refundAmount;

    console.log(`[cancel-booking] Calculated Refund: ${refundAmount}, Fee: ${cancellationFee}`);

    // 3. Execute Stripe Refund (if applicable)
    let refundId = null;

    if (paymentIntentId && refundAmount > 0) {
      try {
        const refundAmountCents = Math.round(refundAmount * 100);

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
        // CRITICAL: Return error and do NOT cancel booking if refund fails.
        // Unless user explicitly requested force override, which we don't have here.
        return new Response(JSON.stringify({
          error: 'Refund failed. Booking was NOT cancelled.',
          details: stripeError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    } else if (!paymentIntentId) {
      console.warn("[cancel-booking] No payment intent found. Skipping refund.");
    }

    // 4. Update DB
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
      message: refundId ? 'Cancellation and refund successful' : 'Cancellation successful (no refund processed)'
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
