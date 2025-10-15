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

  try {
    console.log("[BOOKING-EXPIRY-LOCKED] Starting expiry check with locking");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Lock and select expired slot bookings (prevents race with reminders)
    const { data: expiredSlots, error: lockError } = await supabaseAdmin
      .rpc('lock_and_select_expired_bookings', {
        p_lock_duration_minutes: 10
      });

    if (lockError) {
      console.error('[BOOKING-EXPIRY-LOCKED] Error locking expired bookings:', lockError);
      throw lockError;
    }

    if (!expiredSlots || expiredSlots.length === 0) {
      console.log('[BOOKING-EXPIRY-LOCKED] No expired bookings found');
      return new Response(
        JSON.stringify({ success: true, cancelled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`[BOOKING-EXPIRY-LOCKED] Found ${expiredSlots.length} expired bookings`);

    let cancelledCount = 0;
    const now = new Date().toISOString();

    for (const booking of expiredSlots) {
      try {
        // Cancel the booking
        await supabaseAdmin
          .from("bookings")
          .update({
            status: "cancelled",
            cancelled_at: now,
            cancellation_reason: "Pagamento non completato entro il limite di tempo",
          })
          .eq("id", booking.id);

        // Notify user
        await supabaseAdmin.from("user_notifications").insert({
          user_id: booking.user_id,
          type: "booking",
          title: "Prenotazione scaduta",
          content: "La tua prenotazione è stata cancellata perché non hai completato il pagamento in tempo.",
          metadata: {
            booking_id: booking.id,
            reason: "slot_expired",
          },
        });

        cancelledCount++;
        console.log(`[BOOKING-EXPIRY-LOCKED] Cancelled booking ${booking.id}`);
      } catch (cancelError) {
        console.error(`[BOOKING-EXPIRY-LOCKED] Error cancelling booking ${booking.id}:`, cancelError);
      }
    }

    // Unlock all processed bookings
    if (expiredSlots.length > 0) {
      await supabaseAdmin.rpc('unlock_bookings', {
        booking_ids: expiredSlots.map(b => b.id)
      });
      console.log(`[BOOKING-EXPIRY-LOCKED] Unlocked ${expiredSlots.length} bookings`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: expiredSlots.length,
        cancelled: cancelledCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[BOOKING-EXPIRY-LOCKED] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
