import { createClient } from "npm:@supabase/supabase-js@2.45.3";
import Stripe from "npm:stripe@16.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const body = await req.json();
    const { booking_id, return_url } = body;

    if (!booking_id || !return_url) {
      return new Response(JSON.stringify({ error: "Missing booking_id or return_url" }), { status: 400 });
    }

    // 1. Fetch Booking & Space Info
    const { data: booking } = await supabase
      .from("bookings")
      .select("*, spaces(title, photos)")
      .eq("id", booking_id)
      .single();

    if (!booking) throw new Error("Booking not found");

    // 2. Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${return_url}?success=true`,
      cancel_url: `${return_url}?canceled=true`,
      metadata: { booking_id: booking_id }, // CRITICAL
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "eur",
          product_data: {
            name: booking.spaces?.title || "Coworking Booking",
            images: booking.spaces?.photos ? [booking.spaces.photos[0]] : [],
          },
          unit_amount: Math.round(Number(booking.total_price) * 100),
        },
      }],
    });

    // 3. Save Session ID
    await supabase.from("bookings").update({ payment_session_id: session.id }).eq("id", booking_id);

    return new Response(JSON.stringify({ url: session.url }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
