import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@15.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("HOST-APPROVE-BOOKING V2 START");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[HOST-APPROVE] Starting host approval process");

    // 1. AUTHENTICATION CHECK
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

    // Verify JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 2. FETCH BOOKING AND WORKSPACE SEQUENTIALLY
    // Fetch Booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, stripe_payment_intent_id, booking_date, start_time, end_time, space_id, request_invoice")
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      console.error("[HOST-APPROVE] Booking fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Fetch Workspace (using "workspaces" table and aliasing name as title)
    // Note: Cast as any to avoid type errors with dynamic aliasing in Deno
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .select("host_id, title:name")
      .eq("id", booking.space_id)
      .single();

    if (workspaceError || !workspace) {
      console.error("[HOST-APPROVE] Workspace fetch error:", workspaceError);
      return new Response(
        JSON.stringify({ error: "Workspace not found for this booking" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // 3. VALIDATE HOST OWNERSHIP
    if (workspace.host_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: You are not the host of this space" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (booking.status !== "pending_approval") {
      return new Response(
        JSON.stringify({ error: "Booking is not in pending_approval status" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 4. STRIPE CAPTURE (If applicable)
    let captureId = null;
    if (booking.stripe_payment_intent_id) {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16',
        });

        console.log(`[HOST-APPROVE] Checking Payment Intent: ${booking.stripe_payment_intent_id}`);
        const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);

        if (pi.status === 'requires_capture') {
            console.log(`[HOST-APPROVE] Capturing funds for PI: ${pi.id}`);
            try {
                const capturedPi = await stripe.paymentIntents.capture(pi.id);
                if (capturedPi.status === 'succeeded') {
                    captureId = capturedPi.id;
                    console.log(`[HOST-APPROVE] Capture successful.`);
                } else {
                    throw new Error(`Capture failed with status: ${capturedPi.status}`);
                }
            } catch (stripeError) {
                console.error(`[HOST-APPROVE] Stripe Capture Error:`, stripeError);
                return new Response(
                    JSON.stringify({ error: "Payment Capture Failed. The authorized funds could not be captured. Please contact support or the guest." }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
                );
            }
        } else if (pi.status === 'succeeded') {
             console.log(`[HOST-APPROVE] Payment already captured.`);
        } else {
             console.warn(`[HOST-APPROVE] Payment Intent status unexpected: ${pi.status}`);
             // We allow proceeding if it's already processed, but warn.
        }
    } else {
        console.warn(`[HOST-APPROVE] No Payment Intent ID found on booking. Proceeding with database update only.`);
    }

    // 5. UPDATE BOOKING STATUS
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error("[HOST-APPROVE] Booking update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update booking status" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // 6. SEND NOTIFICATION TO COWORKER
    // Cast workspace to access title safely
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
  } catch (error) {
    console.error("[HOST-APPROVE] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
