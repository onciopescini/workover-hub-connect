import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { corsHeaders } from "../_shared/cors.ts";
import { calculateRefund } from "../_shared/policy-calculator.ts";

console.log("CANCEL BOOKING - FORCE UPDATE V5 (WILDCARD & AUTH RELEASE)");

serve(async (req) => {
  // 1. WILDCARD ROUTING: Handle OPTIONS and POST regardless of path suffix
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is missing");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

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

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    let body;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    const { booking_id, reason } = body;

    if (!booking_id) {
      throw new Error("Missing booking_id");
    }

    console.log(`[cancel-booking] Processing cancellation for booking: ${booking_id}, user: ${user.id}`);

    // 2. FETCH DATA
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
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Determine host_id from workspace
    // Alias 'name' to 'title' for compatibility
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('workspaces')
      .select('host_id, title:name')
      .eq('id', booking.space_id)
      .single();

    if (workspaceError || !workspace) {
         console.error('[cancel-booking] Workspace not found:', workspaceError);
         return new Response(JSON.stringify({ error: 'Workspace not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          });
    }

    // Fetch Host Profile
    const { data: hostProfile } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name, stripe_account_id')
      .eq('id', workspace?.host_id)
      .single();

    // 3. SECURITY CHECK
    const isGuest = booking.user_id === user.id;
    const isHost = workspace?.host_id === user.id;

    if (!isGuest && !isHost) {
       return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const cancelled_by_host = isHost;
    const cancellationPolicy = booking.cancellation_policy || 'moderate';

    // -------------------------------------------------------------------------
    // 4. STRIPE LOGIC: AUTH vs CAPTURE
    // -------------------------------------------------------------------------

    // Find Payment Intent ID
    // Priority: 1. Completed Payment (for refunds) 2. Booking Record (for auth release)
    const payment = booking.payments?.find((p: any) => p.payment_status === 'completed');
    const paymentIntentId = payment?.stripe_payment_intent_id || booking.stripe_payment_intent_id;

    console.log(`[cancel-booking] PI ID Resolution: Booking=${booking.stripe_payment_intent_id}, Payment=${payment?.stripe_payment_intent_id}, Final=${paymentIntentId}`);

    let actionTaken = 'none';
    let refundId = null;

    if (paymentIntentId) {
        console.log(`[cancel-booking] Retrieving PI: ${paymentIntentId} from Stripe...`);
        try {
            const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
            console.log(`[cancel-booking] PI Status: ${pi.status}`);

            if (pi.status === 'requires_capture') {
                // -----------------------------------------------------------------
                // SCENARIO A: RELEASE AUTHORIZATION (Money not taken yet)
                // -----------------------------------------------------------------
                console.log(`[cancel-booking] Status is 'requires_capture'. Attempting to cancel Authorization...`);
                try {
                    const canceledPi = await stripe.paymentIntents.cancel(paymentIntentId);
                    if (canceledPi.status === 'canceled') {
                        console.log(`[cancel-booking] Authorization successfully Cancelled.`);
                        actionTaken = 'auth_released';
                    } else {
                        console.error(`[cancel-booking] Authorization cancellation returned status: ${canceledPi.status}`);
                    }
                } catch (cancelError) {
                     console.error(`[cancel-booking] FAILED to cancel authorization:`, cancelError);
                     // Allow DB cancellation to proceed to unlock the calendar
                }

            } else if (pi.status === 'succeeded') {
                // -----------------------------------------------------------------
                // SCENARIO B: REFUND (Money already taken)
                // -----------------------------------------------------------------
                console.log(`[cancel-booking] Status is 'succeeded'. Proceeding with Refund Logic.`);
                actionTaken = 'refunded';

                // 1. Calculate Refund %
                let refundPercentage = 0;
                if (cancelled_by_host) {
                    refundPercentage = 1.0;
                } else {
                    const bookingDateStr = booking.booking_date;
                    const startTimeStr = booking.start_time || "00:00:00";
                    const bookingDateTime = new Date(`${bookingDateStr}T${startTimeStr}`);
                    const now = new Date();
                    const result = calculateRefund(100, cancellationPolicy, bookingDateTime, now);
                    refundPercentage = 1 - (result.penaltyPercentage / 100);
                }

                const grossAmountCents = pi.amount;
                const metaBase = pi.metadata?.base_amount || pi.metadata?.basePrice;
                const basePriceCents = metaBase ? Math.round(parseFloat(metaBase) * 100) : grossAmountCents;

                // Get Host Transfer
                const charge = pi.latest_charge as any;
                let transferId = charge?.transfer;
                if (typeof transferId !== 'string') transferId = transferId?.id;

                if (!transferId && hostProfile?.stripe_account_id) {
                     console.log("[cancel-booking] Transfer ID missing on charge, attempting lookup...");
                     // Fallback could go here
                }

                if (transferId) {
                    const transfer = await stripe.transfers.retrieve(transferId);
                    const hostTransferAmountCents = transfer.amount;

                    // Calcs
                    let guestRefundCents = 0;
                    let hostReversalCents = 0;

                    if (cancelled_by_host) {
                        guestRefundCents = grossAmountCents;
                        hostReversalCents = hostTransferAmountCents;
                    } else {
                        guestRefundCents = Math.round(basePriceCents * refundPercentage);
                        hostReversalCents = Math.round(hostTransferAmountCents * refundPercentage);
                    }

                    console.log(`[cancel-booking] Refund plan: Guest=${guestRefundCents}, Reversal=${hostReversalCents}`);

                    // Execute Reversal
                    if (hostReversalCents > 0) {
                        try {
                            await stripe.transfers.createReversal(transferId, { amount: hostReversalCents });
                            console.log(`[cancel-booking] Transfer reversed.`);
                        } catch (revError) {
                            console.error(`[cancel-booking] Transfer reversal failed:`, revError);
                        }
                    }

                    // Execute Refund
                    if (guestRefundCents > 0) {
                        try {
                            const refund = await stripe.refunds.create({
                                payment_intent: paymentIntentId,
                                amount: guestRefundCents,
                                reason: cancelled_by_host ? 'requested_by_customer' : 'requested_by_customer',
                            });
                            refundId = refund.id;
                            console.log(`[cancel-booking] Refund created: ${refund.id}`);
                        } catch (refError) {
                            console.error(`[cancel-booking] Refund creation failed:`, refError);
                        }
                    }
                } else {
                    console.warn(`[cancel-booking] No transfer ID found. Attempting simple refund.`);
                     try {
                        const refund = await stripe.refunds.create({
                            payment_intent: paymentIntentId,
                            amount: cancelled_by_host ? grossAmountCents : Math.round(basePriceCents * refundPercentage),
                        });
                        refundId = refund.id;
                    } catch (e) { console.error('Refund no-transfer failed', e); }
                }
            } else {
                console.warn(`[cancel-booking] PI status '${pi.status}' unhandled.`);
            }
        } catch (stripeError) {
             console.error(`[cancel-booking] Critical Stripe Error:`, stripeError);
             // Allow DB cancellation to proceed
        }
    } else {
        console.warn(`[cancel-booking] No Payment Intent ID found. Skipping Stripe logic.`);
    }

    // -------------------------------------------------------------------------
    // 5. DB UPDATE (Always happens if we reached here)
    // -------------------------------------------------------------------------
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_host: cancelled_by_host,
        cancellation_reason: reason || (cancelled_by_host ? 'Host rejected/cancelled' : 'User cancelled')
      })
      .eq('id', booking_id);

    if (updateError) {
        throw new Error(`Failed to update booking status: ${updateError.message}`);
    }

    // Update Payment status if needed
    if (refundId && payment) {
         await supabaseClient.from('payments').update({ payment_status: 'refunded' }).eq('id', payment.id);
    } else if (actionTaken === 'auth_released' && payment) {
         await supabaseClient.from('payments').update({ payment_status: 'cancelled' }).eq('id', payment.id);
    }

    return new Response(JSON.stringify({
      success: true,
      action: actionTaken,
      message: actionTaken === 'auth_released' ? 'Authorization Released' : 'Booking Cancelled/Refunded'
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
