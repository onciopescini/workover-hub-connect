import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. FORCE DEPLOY LOG - This confirms the new version is live
    console.log("🚀 PAYMENT SESSION V8 - FORCED UPDATE - " + new Date().toISOString());

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // 3. Read Body (Loose validation to prevent 400s)
    const body = await req.json();
    const targetBookingId = body.booking_id || body.bookingId;
    const origin = body.origin || 'https://workover.it'; // Fallback origin

    console.log("PAYLOAD RECEIVED:", body);

    if (!targetBookingId) {
        throw new Error("MISSING_BOOKING_ID: Please provide booking_id");
    }

    // 4. Fetch Data Sequentially (No Joins)

    // A. Booking
    const { data: booking, error: bError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", targetBookingId)
      .single();

    if (bError || !booking) throw new Error(`BOOKING_ERROR: ${JSON.stringify(bError)}`);

    // B. Workspace
    // Handle legacy 'space_id' vs new 'workspace_id'
    const spaceId = booking.space_id || booking.workspace_id;
    const { data: workspace, error: wError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", spaceId)
        .single();

    if (wError || !workspace) throw new Error(`WORKSPACE_ERROR: ${JSON.stringify(wError)}`);

    // C. Host Profile
    const { data: profile, error: pError } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", workspace.host_id)
        .single();

    if (pError || !profile?.stripe_account_id) throw new Error("HOST_ERROR: Stripe ID missing");

    // 5. Calculate Price
    let amount = 5000; // Fallback 50 euro
    if (workspace.price_per_day) {
        amount = Math.round(Number(workspace.price_per_day) * 100);
    }
    // Simple override if hourly logic is needed later

    const applicationFee = Math.round(amount * 0.10); // 10% Fee

    // 6. Create Stripe Session
    console.log("Creating Stripe Session for:", profile.stripe_account_id);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: workspace.name,
            description: `Prenotazione: ${booking.booking_date}`
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/bookings?status=success`,
      cancel_url: `${origin}/spaces/${workspace.id}?status=cancelled`,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: profile.stripe_account_id,
        },
        metadata: {
            booking_id: booking.id
        }
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("FATAL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
