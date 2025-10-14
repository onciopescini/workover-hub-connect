import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  try {
    console.log("[SCHEDULE-PAYOUTS] Starting payout scheduling job");

    // Query bookings ready for payout (T+24h after served)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: bookings, error: queryError } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        space_id,
        user_id,
        service_completed_at,
        spaces (
          host_id,
          title,
          profiles:host_id (
            stripe_account_id,
            first_name,
            last_name,
            email
          )
        ),
        payments (
          id,
          payment_status,
          host_amount,
          stripe_session_id
        )
      `)
      .eq("status", "served")
      .lte("service_completed_at", twentyFourHoursAgo)
      .is("payout_scheduled_at", null);

    if (queryError) throw queryError;

    console.log(`[SCHEDULE-PAYOUTS] Found ${bookings?.length || 0} bookings ready for payout`);

    let scheduledCount = 0;

    for (const booking of bookings || []) {
      // Check for blocking payment statuses
      const payment = booking.payments?.[0];
      if (!payment) {
        console.log(`[SCHEDULE-PAYOUTS] No payment found for booking ${booking.id}, skipping`);
        continue;
      }

      if (["refund_pending", "disputed"].includes(payment.payment_status)) {
        console.log(`[SCHEDULE-PAYOUTS] Booking ${booking.id} blocked by payment status: ${payment.payment_status}`);
        continue;
      }

      const hostProfile = booking.spaces?.profiles;
      const stripeAccountId = hostProfile?.stripe_account_id;

      if (!stripeAccountId) {
        console.error(`[SCHEDULE-PAYOUTS] Host ${booking.spaces?.host_id} has no Stripe account ID`);
        continue;
      }

      if (!payment.host_amount || payment.host_amount <= 0) {
        console.error(`[SCHEDULE-PAYOUTS] Invalid host_amount for booking ${booking.id}: ${payment.host_amount}`);
        continue;
      }

      try {
        // Create Stripe Transfer to host
        const transfer = await stripe.transfers.create({
          amount: Math.round(payment.host_amount * 100), // Convert to cents
          currency: "eur",
          destination: stripeAccountId,
          description: `Payout for booking ${booking.id} - ${booking.spaces?.title}`,
          metadata: {
            booking_id: booking.id,
            payment_id: payment.id,
            host_id: booking.spaces?.host_id || "",
          },
        });

        console.log(`[SCHEDULE-PAYOUTS] ✅ Stripe transfer created: ${transfer.id}`);

        // Update booking with payout info
        const { error: updateError } = await supabaseAdmin
          .from("bookings")
          .update({
            payout_scheduled_at: new Date().toISOString(),
            payout_completed_at: new Date().toISOString(),
            payout_stripe_transfer_id: transfer.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", booking.id);

        if (updateError) {
          console.error(`[SCHEDULE-PAYOUTS] Error updating booking ${booking.id}:`, updateError);
          continue;
        }

        // Send notification to host
        await supabaseAdmin.from("user_notifications").insert({
          user_id: booking.spaces?.host_id,
          type: "payout",
          title: "💰 Pagamento Ricevuto",
          content: `Il pagamento di €${payment.host_amount.toFixed(2)} per "${booking.spaces?.title}" è stato trasferito sul tuo account Stripe.`,
          metadata: {
            booking_id: booking.id,
            transfer_id: transfer.id,
            amount: payment.host_amount,
          },
        });

        scheduledCount++;
        console.log(`[SCHEDULE-PAYOUTS] ✅ Payout completed for booking ${booking.id}`);
      } catch (stripeError) {
        console.error(`[SCHEDULE-PAYOUTS] Stripe error for booking ${booking.id}:`, stripeError);
      }
    }

    console.log(`[SCHEDULE-PAYOUTS] ✅ Job completed: ${scheduledCount} payouts scheduled`);

    return new Response(
      JSON.stringify({
        success: true,
        scheduled_count: scheduledCount,
        checked_count: bookings?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SCHEDULE-PAYOUTS] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
