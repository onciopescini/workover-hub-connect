import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🚀 PAYMENT SESSION V6 - DB SOURCE OF TRUTH 🚀");

    // 2. Read Request Body - ONLY booking_id
    let body;
    try {
        body = await req.json();
    } catch (e) {
        throw new Error("Invalid JSON body");
    }

    const { booking_id, bookingId, origin } = body;
    const targetBookingId = booking_id || bookingId;
    const requestOrigin = origin || req.headers.get("origin") || "http://localhost:3000";

    console.log("Target Booking ID:", targetBookingId);

    if (!targetBookingId) {
        throw new Error("Missing booking_id in payload");
    }

    // 3. Setup Clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!stripeKey || !supabaseServiceKey) {
        throw new Error("Missing API Keys in Supabase Secrets");
    }

    // Client for Auth Verification
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    // Client for DB Operations (Admin/Service Role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // 4. Verify User
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
        throw new Error("Unauthorized: User verification failed");
    }
    console.log("User Authenticated:", user.id);

    // 5. FETCH SEQUENTIAL DATA (DB Source of Truth)

    // A. Fetch Booking
    console.log("[1/3] Fetching Booking:", targetBookingId);
    const { data: booking, error: bookingError } = await supabaseAdmin
        .from("bookings")
        .select("*")
        .eq("id", targetBookingId)
        .single();

    if (bookingError || !booking) {
        throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // B. Fetch Workspace
    const spaceId = booking.space_id; // Using strict space_id from booking
    console.log("[2/3] Fetching Workspace:", spaceId);

    const { data: workspace, error: workspaceError } = await supabaseAdmin
        .from("workspaces")
        .select("*")
        .eq("id", spaceId)
        .single();

    if (workspaceError || !workspace) {
        throw new Error(`Workspace not found: ${workspaceError?.message}`);
    }

    // C. Fetch Host Profile
    const hostId = workspace.host_id;
    console.log("[3/3] Fetching Host Profile:", hostId);

    const { data: hostProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", hostId)
        .single();

    if (profileError || !hostProfile?.stripe_account_id) {
        throw new Error("Host Stripe ID not found or profile missing");
    }

    // 6. ROBUST PRICING LOGIC (V2 Logic)
    const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
    const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    console.log(`Duration: ${durationHours}h`);
    if (durationHours <= 0) throw new Error("Invalid duration calculation");

    let unitPrice = 0;

    // Logic: If duration < 8h & hourly rate exists -> Hourly. Else -> Daily.
    if (durationHours < 8 && workspace.price_per_hour) {
        console.log(`[PRICING] Hourly Rate: ${workspace.price_per_hour} * ${durationHours}h`);
        unitPrice = workspace.price_per_hour * durationHours;
    } else {
        console.log(`[PRICING] Daily Rate (Duration: ${durationHours}h)`);
        if (workspace.price_per_day) {
            unitPrice = workspace.price_per_day;
        } else {
            throw new Error("Applicable price (Daily) not defined for this workspace");
        }
    }

    const guests = booking.guests_count || 1;
    const basePrice = unitPrice * guests;

    // Fees: 5% Service + 22% VAT on Service
    const serviceFeePct = 0.05;
    const vatPct = 0.22;
    const serviceFee = basePrice * serviceFeePct;
    const vat = serviceFee * vatPct;
    const totalPlatformFee = serviceFee + vat;
    const totalPrice = basePrice + totalPlatformFee;

    // Convert to CENTS
    const unitAmountCents = Math.round(totalPrice * 100);
    const applicationFeeCents = Math.round(totalPlatformFee * 100);

    console.log("FINANCIALS (Cents):", {
        unitAmountCents,
        applicationFeeCents,
        basePrice,
        totalPlatformFee
    });

    if (applicationFeeCents >= unitAmountCents) {
        throw new Error("Calculated fee exceeds or equals total amount");
    }

    // 7. CREATE STRIPE SESSION
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: workspace.name,
              description: `Booking: ${booking.booking_date} (${durationHours}h) - ${guests} Guest(s)`,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${requestOrigin}/bookings?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${requestOrigin}/spaces/${workspace.id}?status=cancelled`,
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        transfer_data: {
          destination: hostProfile.stripe_account_id,
        },
        metadata: {
            booking_id: booking.id,
            user_id: user.id
        }
      },
      metadata: {
        booking_id: booking.id,
        user_id: user.id
      }
    });

    console.log("Session Created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
