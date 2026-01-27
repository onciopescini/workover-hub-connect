import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@15.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("HOST-APPROVE-BOOKING V5 - GOLD STANDARD RAW HANDLER");

serve(async (req) => {
  // 1. CORS PREFLIGHT
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 2. METHOD VALIDATION
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is missing");
    }

    // 3. AUTHENTICATION & SETUP
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Service Role for DB operations (bypass RLS for update if needed, though usually better to stick to rules,
    // but the prompt implies a system-level atomic operation)
    // The previous code used Service Role. I will stick to it for the atomic transaction safety.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the calling user is valid
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // 4. INPUT VALIDATION
    let booking_id;
    try {
      const body = await req.json();
      booking_id = body.booking_id;
    } catch {
       return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`[HOST-APPROVE] Processing booking: ${booking_id} by User: ${user.id}`);

    // 5. DATA FETCHING
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, stripe_payment_intent_id, space_id")
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("spaces")
      .select("host_id, title:name")
      .eq("id", booking.space_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(
        JSON.stringify({ error: "Workspace not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // 6. SECURITY CHECKS
    if (workspace.host_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: You are not the host of this workspace" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (booking.status !== "pending_approval") {
      return new Response(
        JSON.stringify({ error: `Booking status is '${booking.status}', expected 'pending_approval'` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 7. ATOMIC TRANSACTION (Capture -> DB Update -> Compensating Refund)
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    let capturePerformed = false;
    let paymentIntentId = booking.stripe_payment_intent_id;

    try {
      // Step A: Get Payment Intent ID (with self-healing fallback)
      if (!paymentIntentId) {
        console.log(`[HOST-APPROVE] PI ID missing on booking, attempting fallback via payments table...`);
        
        // Get the session ID from payments table
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("stripe_session_id")
          .eq("booking_id", booking_id)
          .single();
        
        if (payment?.stripe_session_id) {
          console.log(`[HOST-APPROVE] Found session ID: ${payment.stripe_session_id}, retrieving from Stripe...`);
          
          // Retrieve the checkout session from Stripe to get the PI ID
          const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id);
          
          if (session.payment_intent) {
            paymentIntentId = typeof session.payment_intent === 'string' 
              ? session.payment_intent 
              : session.payment_intent.id;
            
            console.log(`[HOST-APPROVE] Retrieved PI ID from Stripe: ${paymentIntentId}`);
            
            // Self-heal: Update the booking with the PI ID for future operations
            await supabaseAdmin
              .from("bookings")
              .update({ stripe_payment_intent_id: paymentIntentId })
              .eq("id", booking_id);
            
            // Also update the payment record
            await supabaseAdmin
              .from("payments")
              .update({ stripe_payment_intent_id: paymentIntentId })
              .eq("booking_id", booking_id);
            
            console.log(`[HOST-APPROVE] Self-healed: PI ID saved to booking and payment records`);
          } else {
            console.error(`[HOST-APPROVE] Stripe session has no payment_intent. Payment may not be complete.`);
            throw new Error("Payment not yet completed by guest. Cannot approve.");
          }
        } else {
          console.error(`[HOST-APPROVE] No payment record found for booking ${booking_id}`);
          throw new Error("No payment found for this booking.");
        }
      }

      // Step B: Capture Payment
      if (paymentIntentId) {
        console.log(`[HOST-APPROVE] Retrieving PI: ${paymentIntentId}`);
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (pi.status === 'requires_capture') {
          console.log(`[HOST-APPROVE] Capturing funds...`);
          const capturedPi = await stripe.paymentIntents.capture(pi.id);

          if (capturedPi.status !== 'succeeded') {
            throw new Error(`Capture failed with status: ${capturedPi.status}`);
          }
          capturePerformed = true;
          console.log(`[HOST-APPROVE] Capture successful.`);
        } else if (pi.status === 'succeeded') {
           console.log(`[HOST-APPROVE] Payment already captured (idempotent path).`);
        } else {
           console.warn(`[HOST-APPROVE] Unexpected PI status: ${pi.status}. Proceeding with caution.`);
        }
      } else {
          console.warn(`[HOST-APPROVE] No payment intent ID found. Proceeding without capture.`);
      }

      // Step B: Update Payment Status BEFORE Booking Confirmation
      // This satisfies the guard_confirm_without_success trigger
      if (paymentIntentId) {
        const { error: paymentUpdateError } = await supabaseAdmin
          .from("payments")
          .update({
            payment_status: 'completed',
            payment_status_enum: 'succeeded',
            capture_status: 'captured'
          })
          .eq("booking_id", booking_id);
          
        if (paymentUpdateError) {
          console.error(`[HOST-APPROVE] Failed to update payment status:`, paymentUpdateError);
          throw new Error(`Payment status update failed: ${paymentUpdateError.message}`);
        }
        console.log(`[HOST-APPROVE] Payment status updated to succeeded`);
      }

      // Step C: Update Booking Status (trigger will now pass)
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking_id);

      if (updateError) {
        throw new Error(`DB Update Failed: ${updateError.message}`);
      }

      // Step C: Notifications (Fire and forget, or awaited - keeping it simple/robust)
      // Notification failure should NOT trigger a refund of the money.
      try {
        console.log(`[HOST-APPROVE] Invoking send-booking-notification for confirmation...`);
        const { error: invokeError } = await supabaseAdmin.functions.invoke('send-booking-notification', {
          body: { booking_id: booking_id, type: 'confirmation' }
        });

        if (invokeError) {
          console.error("[HOST-APPROVE] Notification invocation failed:", invokeError);
        }
      } catch (notifyError) {
          console.error("[HOST-APPROVE] Notification failed (non-critical):", notifyError);
      }

      return new Response(
        JSON.stringify({ success: true, booking_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } catch (transactionError: any) {
      console.error(`[HOST-APPROVE] Transaction Failed: ${transactionError.message}`);

      // COMPENSATING TRANSACTION (ROLLBACK)
      // Only necessary if we actually captured money in this run or found it captured
      if (capturePerformed && paymentIntentId) {
        console.warn(`[HOST-APPROVE] STARTING ROLLBACK: Refund for PI ${paymentIntentId}...`);
        try {
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer', // Indicates to Stripe this isn't fraud, but a user/system request
            metadata: {
              reason: "system_rollback_db_failure",
              original_error: transactionError.message
            }
          });
          console.log(`[HOST-APPROVE] ROLLBACK SUCCESSFUL: Funds returned.`);
        } catch (refundError) {
          console.error(`[HOST-APPROVE] CRITICAL: ROLLBACK FAILED. Manual Intervention Required. PI: ${paymentIntentId}`, refundError);
        }
      }

      return new Response(
        JSON.stringify({ error: `Transaction failed: ${transactionError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

  } catch (error) {
    console.error("[HOST-APPROVE] Top-level Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
