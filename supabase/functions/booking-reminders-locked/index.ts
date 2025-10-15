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
    console.log("[BOOKING-REMINDERS-LOCKED] Starting reminder check with locking");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Lock and select bookings needing reminders (prevents race with expiry check)
    const { data: lockedBookings, error: lockError } = await supabaseAdmin
      .rpc('lock_and_select_reminder_bookings', {
        p_lock_duration_minutes: 10
      });

    if (lockError) {
      console.error('[BOOKING-REMINDERS-LOCKED] Error locking bookings:', lockError);
      throw lockError;
    }

    if (!lockedBookings || lockedBookings.length === 0) {
      console.log('[BOOKING-REMINDERS-LOCKED] No bookings need reminders');
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`[BOOKING-REMINDERS-LOCKED] Found ${lockedBookings.length} bookings for reminders`);

    // Get full details for notifications
    const { data: bookingsWithDetails } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        user_id,
        booking_date,
        spaces(
          id,
          title,
          host_id
        )
      `)
      .in('id', lockedBookings.map(b => b.id));

    let remindersSent = 0;

    for (const booking of bookingsWithDetails || []) {
      try {
        // Send reminder notification
        await supabaseAdmin.from("user_notifications").insert({
          user_id: booking.user_id,
          type: "booking",
          title: "Promemoria prenotazione",
          content: `La tua prenotazione per "${booking.spaces?.title}" è domani!`,
          metadata: {
            booking_id: booking.id,
            space_title: booking.spaces?.title,
            booking_date: booking.booking_date,
          },
        });

        remindersSent++;
        console.log(`[BOOKING-REMINDERS-LOCKED] Sent reminder for booking ${booking.id}`);
      } catch (notifyError) {
        console.error(`[BOOKING-REMINDERS-LOCKED] Error sending reminder for ${booking.id}:`, notifyError);
      }
    }

    // Unlock all processed bookings
    if (lockedBookings.length > 0) {
      await supabaseAdmin.rpc('unlock_bookings', {
        booking_ids: lockedBookings.map(b => b.id)
      });
      console.log(`[BOOKING-REMINDERS-LOCKED] Unlocked ${lockedBookings.length} bookings`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: lockedBookings.length,
        sent: remindersSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[BOOKING-REMINDERS-LOCKED] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
