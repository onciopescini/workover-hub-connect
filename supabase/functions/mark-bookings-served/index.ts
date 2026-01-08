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
    console.log("[MARK-SERVED] Starting auto-mark bookings as served job");

    // Query bookings ready to be marked as served
    const { data: bookings, error: queryError } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        space_id,
        user_id,
        booking_date,
        end_time,
        spaces (
          host_id,
          title,
          profiles:host_id (
            fiscal_regime,
            first_name,
            last_name
          )
        )
      `)
      .eq("status", "confirmed")
      .eq("host_issue_reported", false)
      .lt("booking_date", new Date().toISOString().split("T")[0]);

    if (queryError) throw queryError;

    console.log(`[MARK-SERVED] Found ${bookings?.length || 0} bookings to check`);

    let markedCount = 0;
    const now = new Date();

    for (const booking of bookings || []) {
      // Calculate end datetime
      const endDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);
      const fiveMinutesAfterEnd = new Date(endDateTime.getTime() + 5 * 60 * 1000);

      // Check if 5+ minutes have passed since end_time
      if (now < fiveMinutesAfterEnd) {
        console.log(`[MARK-SERVED] Booking ${booking.id} not ready yet (ends at ${endDateTime.toISOString()})`);
        continue;
      }

      // Check for refund/dispute blocks
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("payment_status")
        .eq("booking_id", booking.id)
        .in("payment_status", ["refund_pending", "disputed"])
        .single();

      if (payment) {
        console.log(`[MARK-SERVED] Booking ${booking.id} blocked by payment status: ${payment.payment_status}`);
        continue;
      }

      // Mark as served
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({
          status: "served",
          service_completed_at: endDateTime.toISOString(),
          service_completed_by: "system",
          updated_at: now.toISOString(),
        })
        .eq("id", booking.id);

      if (updateError) {
        console.error(`[MARK-SERVED] Error updating booking ${booking.id}:`, updateError);
        continue;
      }

      markedCount++;
      console.log(`[MARK-SERVED] ✅ Booking ${booking.id} marked as served`);

      // Trigger fiscal document generation
      // FIX: Access array elements [0] for both spaces and profiles relations
      const hostProfile = booking.spaces?.[0]?.profiles?.[0];
      const fiscalRegime = hostProfile?.fiscal_regime;

      try {
        if (fiscalRegime === "privato") {
          // Generate non-fiscal receipt
          await supabaseAdmin.functions.invoke("generate-non-fiscal-receipt", {
            body: { booking_id: booking.id },
          });
          console.log(`[MARK-SERVED] Triggered non-fiscal receipt for booking ${booking.id}`);
        } else if (fiscalRegime === "forfettario" || fiscalRegime === "ordinario") {
          // Generate WorkOver invoice + notify host
          await Promise.all([
            supabaseAdmin.functions.invoke("generate-workover-invoice", {
              body: { booking_id: booking.id },
            }),
            supabaseAdmin.functions.invoke("notify-host-invoice-required", {
              body: { booking_id: booking.id },
            }),
          ]);
          console.log(`[MARK-SERVED] Triggered invoice generation + host notification for booking ${booking.id}`);
        }
      } catch (fiscalError) {
        console.error(`[MARK-SERVED] Error triggering fiscal documents for booking ${booking.id}:`, fiscalError);
      }
    }

    console.log(`[MARK-SERVED] ✅ Job completed: ${markedCount} bookings marked as served`);

    return new Response(
      JSON.stringify({
        success: true,
        marked_count: markedCount,
        checked_count: bookings?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[MARK-SERVED] Fatal error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
