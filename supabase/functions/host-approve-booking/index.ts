import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@15.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("HOST-APPROVE-BOOKING V4 - ATOMIC & WILDCARD FIX");

serve(async (req) => {
  // 1. WILDCARD ROUTING: Handle OPTIONS and POST regardless of path
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is missing");
    }

    // 2. AUTHENTICATION
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // 3. INPUT VALIDATION
    // Robust body parsing
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

    console.log(`[HOST-APPROVE] Processing booking: ${booking_id}`);

    // 4. DATA FETCHING
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, stripe_payment_intent_id, booking_date, start_time, end_time, space_id, request_invoice")
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("host_id, title:name")
      .eq("id", booking.space_id)
      .single();

    if (workspaceError || !workspace) {
      return new Response(
        JSON.stringify({ error: "Workspace not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // 5. SECURITY CHECKS
    if (workspace.host_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Not the host" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (booking.status !== "pending_approval") {
      return new Response(
        JSON.stringify({ error: "Booking is not pending_approval" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 6. ATOMIC TRANSACTION (Capture -> DB Update -> Compensating Refund)
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    let capturePerformed = false;
    const paymentIntentId = booking.stripe_payment_intent_id;

    try {
      // Step A: Capture Payment (if exists)
      if (paymentIntentId) {
        console.log(`[HOST-APPROVE] Checking PI: ${paymentIntentId}`);
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
           console.log(`[HOST-APPROVE] Already captured.`);
        }
      }

      // Step B: Update Database
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

      // Step C: Send Notification (Non-critical, can happen after success)
      const workspaceData = workspace as any;
      await supabaseAdmin.from("user_notifications").insert({
        user_id: booking.user_id,
        type: "booking",
        title: "Prenotazione Confermata!",
        content: `🎉 La tua prenotazione per "${workspaceData.title}" è stata confermata dall'host.`,
        metadata: {
          booking_id: booking.id,
          space_title: workspaceData.title,
          action_required: "none",
          urgent: false,
        },
      });

      return new Response(
        JSON.stringify({ success: true, booking_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } catch (transactionError: any) {
      console.error(`[HOST-APPROVE] Transaction Failed: ${transactionError.message}`);

      // COMPENSATING TRANSACTION
      if (capturePerformed && paymentIntentId) {
        console.warn(`[HOST-APPROVE] ROLLBACK: Attempting to refund captured funds for PI ${paymentIntentId}...`);
        try {
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer', // Best fit for "System Error/Rollback"
            metadata: {
              reason: "system_rollback_db_failure",
              original_error: transactionError.message
            }
          });
          console.log(`[HOST-APPROVE] ROLLBACK: Refund successful.`);
        } catch (refundError) {
          console.error(`[HOST-APPROVE] CRITICAL: ROLLBACK FAILED. Funds captured but Booking not confirmed! Error:`, refundError);
          // In a real system, we would alert an admin channel here.
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
