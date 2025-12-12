import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. GESTIONE CORS (Preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🔥 PAYMENT SESSION RELOADED - V5 (MANUAL FIX) 🔥");

    // 2. SETUP CLIENT
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!stripeKey || !supabaseKey) {
        throw new Error("Missing API Keys in Supabase Secrets");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // 3. LETTURA BODY
    const { booking_id, bookingId, origin } = await req.json();
    const targetBookingId = booking_id || bookingId; // Accetta entrambi i formati

    console.log("Target Booking ID:", targetBookingId);

    if (!targetBookingId) throw new Error("Booking ID mancante nel payload");

    // 4. FETCH SEQUENZIALE (NO JOIN!)

    // A. Prendi la prenotazione
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", targetBookingId)
      .single();

    if (bookingError || !booking) throw new Error(`Booking non trovato: ${JSON.stringify(bookingError)}`);

    // B. Prendi lo spazio
    // Nota: supportiamo sia space_id che workspace_id per sicurezza
    const spaceId = booking.space_id || booking.workspace_id;
    const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", spaceId)
        .single();

    if (workspaceError || !workspace) throw new Error(`Workspace non trovato: ${JSON.stringify(workspaceError)}`);

    // C. Prendi il profilo Host
    const { data: hostProfile, error: profileError } = await supabase
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", workspace.host_id)
        .single();

    if (profileError || !hostProfile?.stripe_account_id) throw new Error("Host Stripe ID non trovato o profilo mancante");

    console.log("Host Stripe ID:", hostProfile.stripe_account_id);

    // 5. CALCOLO PREZZO
    // Fallback brutale: se qualcosa manca, usa 50€ (5000 cents) per testare il flusso
    let finalAmount = 5000;

    if (workspace.price_per_day) {
        // Calcolo base giornaliero per ora
        finalAmount = Math.round(Number(workspace.price_per_day) * 100);
    }

    // Fee del 10%
    const applicationFee = Math.round(finalAmount * 0.10);

    // 6. CREA SESSIONE STRIPE
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: workspace.name,
              description: `Prenotazione: ${booking.booking_date}`,
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/bookings?status=success`,
      cancel_url: `${origin}/spaces/${workspace.id}?status=cancelled`,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: hostProfile.stripe_account_id,
        },
        metadata: {
            booking_id: booking.id
        }
      },
    });

    console.log("Sessione creata:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("ERRORE CRITICO:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});