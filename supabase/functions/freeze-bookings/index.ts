import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

  try {
    console.log("[FREEZE-BOOKINGS] Starting Stripe disconnection check job");

    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Query confirmed bookings with Stripe-disconnected hosts
    const { data: bookings, error: queryError } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        space_id,
        user_id,
        booking_date,
        start_time,
        status,
        spaces (
          host_id,
          title,
          profiles:host_id (
            stripe_connected,
            first_name,
            last_name
          )
        )
      `)
      .eq("status", "confirmed");

    if (queryError) throw queryError;

    let frozenCount = 0;
    let cancelledCount = 0;

    for (const booking of bookings || []) {
      const hostProfile = booking.spaces?.profiles;
      
      // Skip if host still has Stripe connected
      if (hostProfile?.stripe_connected !== false) {
        continue;
      }

      // Calculate booking start datetime
      const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}`);

      // Auto-cancel + refund if within 24 hours
      if (bookingStart <= twentyFourHoursFromNow) {
        console.log(`[FREEZE-BOOKINGS] Auto-cancelling booking ${booking.id} (starts in <24h, host Stripe disconnected)`);

        try {
          // Call cancel-booking function
          const { data: cancelResult, error: cancelError } = await supabaseAdmin.functions.invoke(
            "process-refund",
            {
              body: {
                booking_id: booking.id,
                cancelled_by_host: true,
                reason: "STRIPE_DISCONNECTED_AUTO_CANCEL",
              },
            }
          );

          if (cancelError) throw cancelError;

          // Send notification to coworker
          await supabaseAdmin.from("user_notifications").insert({
            user_id: booking.user_id,
            type: "booking",
            title: "❌ Prenotazione Cancellata Automaticamente",
            content: `La tua prenotazione per "${booking.spaces?.title}" è stata cancellata perché l'host ha disconnesso il proprio account Stripe. Riceverai un rimborso completo.`,
            metadata: {
              booking_id: booking.id,
              space_title: booking.spaces?.title,
              reason: "stripe_disconnected",
            },
          });

          // Send notification to host
          await supabaseAdmin.from("user_notifications").insert({
            user_id: booking.spaces?.host_id,
            type: "booking",
            title: "⚠️ Prenotazione Cancellata - Stripe Disconnesso",
            content: `La prenotazione per "${booking.spaces?.title}" è stata cancellata automaticamente perché il tuo account Stripe risulta disconnesso. Riconnetti Stripe per evitare ulteriori cancellazioni.`,
            metadata: {
              booking_id: booking.id,
              space_title: booking.spaces?.title,
            },
          });

          cancelledCount++;
          console.log(`[FREEZE-BOOKINGS] ✅ Auto-cancelled booking ${booking.id}`);
        } catch (cancelError) {
          console.error(`[FREEZE-BOOKINGS] Error cancelling booking ${booking.id}:`, cancelError);
        }
      }
      // Freeze if within 48 hours
      else if (bookingStart <= fortyEightHoursFromNow) {
        console.log(`[FREEZE-BOOKINGS] Freezing booking ${booking.id} (starts in <48h, host Stripe disconnected)`);

        const { error: freezeError } = await supabaseAdmin
          .from("bookings")
          .update({
            status: "frozen",
            updated_at: now.toISOString(),
          })
          .eq("id", booking.id);

        if (freezeError) {
          console.error(`[FREEZE-BOOKINGS] Error freezing booking ${booking.id}:`, freezeError);
          continue;
        }

        // Send notification to coworker
        await supabaseAdmin.from("user_notifications").insert({
          user_id: booking.user_id,
          type: "booking",
          title: "⚠️ Prenotazione Congelata",
          content: `La tua prenotazione per "${booking.spaces?.title}" è stata temporaneamente congelata perché l'host ha disconnesso Stripe. Se non risolve entro 24 ore, riceverai un rimborso automatico.`,
          metadata: {
            booking_id: booking.id,
            space_title: booking.spaces?.title,
            booking_start: bookingStart.toISOString(),
          },
        });

        // Send notification to host
        await supabaseAdmin.from("user_notifications").insert({
          user_id: booking.spaces?.host_id,
          type: "booking",
          title: "🚨 URGENTE: Riconnetti Stripe",
          content: `La prenotazione per "${booking.spaces?.title}" è stata congelata. Hai 24 ore per riconnettere Stripe, altrimenti verrà cancellata automaticamente.`,
          metadata: {
            booking_id: booking.id,
            space_title: booking.spaces?.title,
            deadline: twentyFourHoursFromNow.toISOString(),
          },
        });

        frozenCount++;
        console.log(`[FREEZE-BOOKINGS] ✅ Frozen booking ${booking.id}`);
      }
    }

    console.log(`[FREEZE-BOOKINGS] ✅ Job completed: ${frozenCount} frozen, ${cancelledCount} auto-cancelled`);

    return new Response(
      JSON.stringify({
        success: true,
        frozen_count: frozenCount,
        cancelled_count: cancelledCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FREEZE-BOOKINGS] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
