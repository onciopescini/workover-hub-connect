import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@15.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("HOST-REJECT-BOOKING V1 - GOLD STANDARD HANDLER");

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

    // Service Role for DB operations (bypass RLS for atomic operations)
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
    let booking_id: string;
    let reason: string;
    try {
      const body = await req.json();
      booking_id = body.booking_id;
      reason = body.reason || "Rifiutata dall'host";
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

    console.log(`[HOST-REJECT] Processing booking: ${booking_id} by User: ${user.id}, Reason: ${reason}`);

    // 5. DATA FETCHING
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, stripe_payment_intent_id, space_id")
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      console.error(`[HOST-REJECT] Booking not found: ${booking_id}, Error: ${fetchError?.message}`);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const { data: space, error: spaceError } = await supabaseAdmin
      .from("spaces")
      .select("host_id, title:name")
      .eq("id", booking.space_id)
      .single();

    if (spaceError || !space) {
      return new Response(
        JSON.stringify({ error: "Space not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // 6. SECURITY CHECKS
    if (space.host_id !== user.id) {
      console.error(`[HOST-REJECT] Host mismatch: Expected ${space.host_id}, got ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: You are not the host of this space" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (booking.status !== "pending_approval") {
      return new Response(
        JSON.stringify({ error: `Booking status is '${booking.status}', expected 'pending_approval'` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 7. STRIPE CANCELLATION (Release Held Funds)
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    const paymentIntentId = booking.stripe_payment_intent_id;
    let stripeCancelled = false;

    if (paymentIntentId) {
      console.log(`[HOST-REJECT] Retrieving PI: ${paymentIntentId}`);
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

        // Only cancel if still in a cancellable state
        if (pi.status === 'requires_capture') {
          console.log(`[HOST-REJECT] Cancelling PI to release funds...`);
          await stripe.paymentIntents.cancel(pi.id, {
            cancellation_reason: 'requested_by_customer'
          });
          stripeCancelled = true;
          console.log(`[HOST-REJECT] PI cancelled successfully. Funds released.`);
        } else if (pi.status === 'canceled') {
          console.log(`[HOST-REJECT] PI already cancelled (idempotent path).`);
          stripeCancelled = true;
        } else if (pi.status === 'succeeded') {
          // Funds were captured, need to refund instead
          console.warn(`[HOST-REJECT] PI already captured. Creating refund...`);
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer',
            metadata: { reason: 'host_rejection', booking_id }
          });
          stripeCancelled = true;
          console.log(`[HOST-REJECT] Refund created successfully.`);
        } else {
          console.warn(`[HOST-REJECT] Unexpected PI status: ${pi.status}. Attempting cancellation anyway.`);
          try {
            await stripe.paymentIntents.cancel(pi.id);
            stripeCancelled = true;
          } catch (cancelError) {
            console.error(`[HOST-REJECT] Could not cancel PI with status ${pi.status}:`, cancelError);
          }
        }
      } catch (stripeError) {
        console.error(`[HOST-REJECT] Stripe error:`, stripeError);
        // Continue with DB update even if Stripe fails - can be reconciled later
      }
    } else {
      console.log(`[HOST-REJECT] No payment intent ID found. Proceeding with DB update only.`);
    }

    // 8. DATABASE UPDATE
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_reason: reason,
        cancelled_by_host: true,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error(`[HOST-REJECT] DB Update Failed:`, updateError);
      return new Response(
        JSON.stringify({ error: `Database update failed: ${updateError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // 9. NOTIFY COWORKER
    try {
      console.log(`[HOST-REJECT] Invoking send-booking-notification for rejection...`);
      const { error: invokeError } = await supabaseAdmin.functions.invoke('send-booking-notification', {
        body: { booking_id: booking_id, type: 'rejection' }
      });

      if (invokeError) {
        console.error("[HOST-REJECT] Notification invocation failed:", invokeError);
      }
    } catch (notifyError) {
      console.error("[HOST-REJECT] Notification failed (non-critical):", notifyError);
    }

    // 10. SUCCESS RESPONSE
    console.log(`[HOST-REJECT] Successfully rejected booking ${booking_id}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        booking_id,
        stripe_cancelled: stripeCancelled
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("[HOST-REJECT] Top-level Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
