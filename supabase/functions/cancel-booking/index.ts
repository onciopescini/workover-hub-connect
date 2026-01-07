import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { corsHeaders } from "../_shared/cors.ts";
import { calculateRefund } from "../_shared/policy-calculator.ts";

console.log("CANCEL BOOKING - FORCE UPDATE");
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

    // Determine host_id from workspace
    const { data: workspace, error: workspaceError } = await supabaseClient
      .from('workspaces')
      .select('host_id, title')
      .eq('id', booking.space_id)
      .single();

    if (workspaceError) {
      console.error("[cancel-booking] Workspace not found for auth check:", workspaceError);
    }

    // Fetch Host Profile (moved up for Stripe logic)
    const { data: hostProfile } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name, stripe_account_id')
      .eq('id', workspace?.host_id)
      .single();

    if (!hostProfile?.stripe_account_id) {
       console.warn("[cancel-booking] Host Stripe Account ID not found. Fallback transfer lookup will fail if needed.");
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
    const cancellationPolicy = booking.cancellation_policy || 'moderate';

    // -------------------------------------------------------------------------
    // STRIPE & REFUND LOGIC
    // -------------------------------------------------------------------------

    // Find the successful payment
    const payment = booking.payments?.find((p: any) => p.payment_status === 'completed');
    const paymentIntentId = payment?.stripe_payment_intent_id || booking.stripe_payment_intent_id;

    // Fallback Gross Amount (From DB) - used if we can't get fresh data
    let grossAmountCents = payment?.amount ? Math.round(payment.amount * 100) : 0; // If DB stores Euros
    // Note: DB typically stores Euros (Float). We work in Cents here for safety.

    let basePriceCents = 0;
    let transferId: string | null = null;
    let hostTransferAmountCents = 0;
    let stripeAvailable = false;

    if (paymentIntentId) {
        try {
            // A. Fetch Detailed Stripe Data (including Charge and Transfer)
            console.log(`[cancel-booking] Fetching Stripe data for PI: ${paymentIntentId}`);
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['latest_charge.transfer']
            });

            stripeAvailable = true;
            grossAmountCents = paymentIntent.amount; // Use Stripe as source of truth

            // B. Extract Metadata (Base Price) - New "Pricing Engine" Aware
            const metaBase = paymentIntent.metadata?.base_amount || paymentIntent.metadata?.basePrice;
            if (metaBase) {
                 // Convert string "100.50" to cents
                 basePriceCents = Math.round(parseFloat(metaBase) * 100);
                 console.log(`[cancel-booking] Base Price found in metadata: ${basePriceCents} cents`);
            } else {
                 // FALLBACK: Legacy Mode (Treat Total as Base)
                 console.warn(`[cancel-booking] LEGACY BOOKING: No base_amount in metadata. Using Gross Amount (${grossAmountCents}) as Base.`);
                 basePriceCents = grossAmountCents;
            }

            // C. Find Host Transfer ID
            // Ideally it is on the Charge
            const charge = paymentIntent.latest_charge as Stripe.Charge;

            if (charge?.transfer) {
                // Handle both expanded object and string ID
                transferId = typeof charge.transfer === 'string'
                    ? charge.transfer
                    : (charge.transfer as Stripe.Transfer).id;
            }

            // FALLBACK: If Transfer ID is missing, try listing transfers
            if (!transferId && hostProfile?.stripe_account_id && booking.created_at) {
                 console.log("[cancel-booking] Transfer ID missing on Charge. Attempting Fallback Lookup via List...");

                 const bookingTime = new Date(booking.created_at).getTime() / 1000;
                 // Look for transfers to this destination created around booking time
                 const transfers = await stripe.transfers.list({
                     destination: hostProfile.stripe_account_id,
                     limit: 1,
                     created: {
                         gt: Math.floor(bookingTime - 60) // 1 minute buffer before creation
                     }
                 });

                 if (transfers.data.length > 0) {
                     transferId = transfers.data[0].id;
                     console.log(`[cancel-booking] Fallback: Found Transfer ID ${transferId}`);
                 }
            }

            // STRICT CHECK: Abort if we expect a transfer but can't find it
            if (!transferId) {
                console.error("[cancel-booking] CRITICAL: Missing Transfer ID. Aborting to prevent platform drain.");
                throw new Error("Cancellation Failed: Unable to locate Host Transfer. Please contact support.");
            }

            // If we found a transfer ID, let's fetch it to be sure of the amount the host got.
            if (transferId) {
                const transfer = await stripe.transfers.retrieve(transferId);
                hostTransferAmountCents = transfer.amount;
                console.log(`[cancel-booking] Host Transfer found: ${transferId}, Amount: ${hostTransferAmountCents}`);
            }

        } catch (e) {
            console.error(`[cancel-booking] Error fetching Stripe data:`, e);
            // Re-throw if it's our critical error, otherwise wrap it
            if (e.message.includes("Cancellation Failed")) throw e;
            throw new Error(`Payment Provider Error: ${e.message}`);
        }
    } else {
        console.warn(`[cancel-booking] No Payment Intent ID found. Assuming free booking or manual override.`);
    }

    // -------------------------------------------------------------------------
    // CALCULATION
    // -------------------------------------------------------------------------

    // Determine Refund Percentage
    let refundPercentage = 0;
    if (cancelled_by_host) {
        refundPercentage = 1.0; // 100%
    } else {
        // Guest Cancel -> Use Policy
        const bookingDateStr = booking.booking_date;
        const startTimeStr = booking.start_time || "00:00:00";
        const bookingDateTime = new Date(`${bookingDateStr}T${startTimeStr}`);
        const now = new Date();

        // Pass dummy amount 100 to get percentage easily from result
        const result = calculateRefund(100, cancellationPolicy, bookingDateTime, now);
        refundPercentage = 1 - (result.penaltyPercentage / 100); // e.g. 0.5 or 1.0
        console.log(`[cancel-booking] Policy: ${cancellationPolicy}, Percentage: ${refundPercentage}`);
    }

    // Calculate Final Amounts
    let guestRefundCents = 0;
    let hostReversalCents = 0;

    if (cancelled_by_host) {
        // HOST CANCEL: Refund Everything. Reverse Everything.
        guestRefundCents = grossAmountCents;
        hostReversalCents = hostTransferAmountCents;
    } else {
        // GUEST CANCEL: Refund % of BASE. Reverse % of TRANSFER.
        guestRefundCents = Math.round(basePriceCents * refundPercentage);
        hostReversalCents = Math.round(hostTransferAmountCents * refundPercentage);
    }

    // Logging Financials
    console.log(`[FINANCIAL] Guest Refund: ${guestRefundCents}, Host Reversal: ${hostReversalCents} (Percentage: ${refundPercentage})`);

    // -------------------------------------------------------------------------
    // EXECUTION - ATOMIC SEQUENCE
    // -------------------------------------------------------------------------

    // Step 1: REVERSE TRANSFER (The Safety Valve)
    if (stripeAvailable && hostReversalCents > 0 && transferId) {
        try {
            console.log(`[cancel-booking] Attempting Reversal of ${hostReversalCents} cents from ${transferId}...`);
            await stripe.transfers.createReversal(transferId, {
                amount: hostReversalCents
            });
            console.log(`[cancel-booking] Reversal Successful.`);
        } catch (reversalError: any) {
            console.error(`[cancel-booking] Reversal Failed:`, reversalError);
            // CRITICAL ABORT: If we can't pull money back, we don't refund.
            return new Response(JSON.stringify({
                error: 'Cancellation Failed: Unable to recover funds from Host. Please contact support.',
                details: reversalError.message
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }
    }

    // Step 2: REFUND GUEST
    let refundId = null;
    if (stripeAvailable && guestRefundCents > 0 && paymentIntentId) {
        try {
            console.log(`[cancel-booking] Attempting Refund of ${guestRefundCents} cents...`);
             const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: guestRefundCents,
                reason: cancelled_by_host ? 'requested_by_customer' : 'requested_by_customer',
                metadata: {
                    booking_id: booking_id,
                    initiated_by: cancelled_by_host ? 'host' : 'guest',
                    policy_applied: cancellationPolicy,
                    base_price_cents: String(basePriceCents),
                    host_reversal_cents: String(hostReversalCents)
                }
            });
            refundId = refund.id;
            console.log(`[cancel-booking] Refund Successful: ${refundId}`);
        } catch (refundError: any) {
             console.error(`[cancel-booking] Refund Failed:`, refundError);
             // Reversal succeeded but Refund failed. This is bad but rare.
             // We return error, but funds are already reversed.
             // In a perfect world we would undo reversal, but that's complex (transfer again).
             // For now, we error out so user retries or calls support.
             return new Response(JSON.stringify({
                error: 'Refund Processing Failed. Funds may have been reserved. Please contact support.',
                details: refundError.message
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }
    }

    // Step 3: UPDATE DB (Only if financial ops succeeded)
    const { error: updateError } = await supabaseClient
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_host: cancelled_by_host,
        cancellation_fee: (grossAmountCents - guestRefundCents) / 100, // Convert back to Euro Float for DB
        cancellation_reason: reason || (cancelled_by_host ? 'Host initiated' : 'User initiated')
      })
      .eq('id', booking_id);

    if (updateError) {
      throw new Error(`Failed to update booking status: ${updateError.message}`);
    }

    if (refundId && payment) {
      await supabaseClient
        .from('payments')
        .update({
          payment_status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);
    }

    // Step 4: NOTIFICATIONS
    try {
        // Fire and forget email logic (kept same as before)
         const { data: guestProfile } = await supabaseClient
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', booking.user_id)
        .single();

      // Note: hostProfile was already fetched above

      if (guestProfile?.email && hostProfile?.email && workspace) {
         const refundAmountEur = guestRefundCents / 100;
         const feeEur = (grossAmountCents - guestRefundCents) / 100;

         const emailPromises = [];
         // Guest Email
         emailPromises.push(
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'booking_cancelled',
              to: guestProfile.email,
              data: {
                userName: guestProfile.first_name,
                spaceTitle: workspace.title || 'Space',
                bookingDate: booking.booking_date,
                reason: reason || (cancelled_by_host ? 'Host initiated' : 'User initiated'),
                cancellationFee: feeEur,
                refundAmount: refundAmountEur,
                currency: 'EUR',
                bookingId: booking.id.slice(0, 8),
                cancelledByHost: cancelled_by_host
              }
            })
          })
        );
        // Host Email
        emailPromises.push(
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'host_booking_cancelled',
              to: hostProfile.email,
              data: {
                hostName: hostProfile.first_name,
                guestName: `${guestProfile.first_name} ${guestProfile.last_name}`,
                spaceTitle: workspace.title || 'Space',
                bookingDate: booking.booking_date,
                refundAmount: refundAmountEur,
                bookingId: booking.id.slice(0, 8),
                cancelledByHost: cancelled_by_host
              }
            })
          })
        );
        await Promise.allSettled(emailPromises);
      }
    } catch (emailError) {
        console.error("Email notification failed", emailError);
    }

    return new Response(JSON.stringify({
      success: true,
      refund_amount: guestRefundCents / 100,
      refund_id: refundId,
      message: 'Cancellation successful'
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
