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
    console.log("[BOOKING-EXPIRY] Starting expiry check job");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date().toISOString();

    // 1. Cancella prenotazioni pending_approval scadute
    const { data: expiredApprovals, error: approvalError } = await supabaseAdmin
      .from("bookings")
      .select("id, space_id, user_id, booking_date, spaces(title, host_id)")
      .eq("status", "pending_approval")
      .lte("approval_deadline", now);

    if (approvalError) {
      console.error("[BOOKING-EXPIRY] Error fetching expired approvals:", approvalError);
    } else if (expiredApprovals && expiredApprovals.length > 0) {
      console.log(`[BOOKING-EXPIRY] Found ${expiredApprovals.length} expired approval requests`);

      for (const booking of expiredApprovals) {
        // Cancella la prenotazione
        await supabaseAdmin
          .from("bookings")
          .update({
            status: "cancelled",
            cancelled_at: now,
            cancellation_reason: "Richiesta di approvazione scaduta - l'host non ha risposto in tempo",
          })
          .eq("id", booking.id);

        // Notifica il coworker
        await supabaseAdmin.from("user_notifications").insert({
          user_id: booking.user_id,
          type: "booking",
          title: "Richiesta di prenotazione scaduta",
          content: `La tua richiesta di prenotazione per "${booking.spaces?.[0]?.title}" è scaduta perché l'host non ha risposto in tempo.`,
          metadata: {
            booking_id: booking.id,
            space_title: booking.spaces?.[0]?.title,
            reason: "approval_expired",
          },
        });

        console.log(`[BOOKING-EXPIRY] Cancelled expired approval booking ${booking.id}`);
      }
    }

    // 2. Cancella prenotazioni pending_payment scadute
    const { data: expiredPayments, error: paymentError } = await supabaseAdmin
      .from("bookings")
      .select("id, space_id, user_id, booking_date, spaces(title, host_id)")
      .eq("status", "pending_payment")
      .lte("payment_deadline", now);

    if (paymentError) {
      console.error("[BOOKING-EXPIRY] Error fetching expired payments:", paymentError);
    } else if (expiredPayments && expiredPayments.length > 0) {
      console.log(`[BOOKING-EXPIRY] Found ${expiredPayments.length} expired payment requests`);

      for (const booking of expiredPayments) {
        // Cancella la prenotazione
        await supabaseAdmin
          .from("bookings")
          .update({
            status: "cancelled",
            cancelled_at: now,
            cancellation_reason: "Pagamento non completato entro 2h dall'approvazione",
          })
          .eq("id", booking.id);

        // Notifica il coworker
        await supabaseAdmin.from("notifications").insert({
          user_id: booking.user_id,
          type: "booking_cancelled",
          metadata: {
            booking_id: booking.id,
            space_title: booking.spaces?.[0]?.title,
            message: `La tua prenotazione per "${booking.spaces?.[0]?.title}" è stata cancellata perché non hai completato il pagamento in tempo.`,
            reason: "payment_expired",
          },
        });

        // Notifica l'host
        await supabaseAdmin.from("notifications").insert({
          user_id: booking.spaces?.[0]?.host_id,
          type: "booking_cancelled",
          metadata: {
            booking_id: booking.id,
            space_title: booking.spaces?.[0]?.title,
            message: `La prenotazione per "${booking.spaces?.[0]?.title}" è stata cancellata perché il coworker non ha completato il pagamento.`,
            reason: "payment_expired",
          },
        });

        console.log(`[BOOKING-EXPIRY] Cancelled expired payment booking ${booking.id}`);
      }
    }

    // 3. Cancella prenotazioni instant (pending) con slot 15min scaduto
    const { data: expiredSlots, error: slotError } = await supabaseAdmin
      .from("bookings")
      .select("id, space_id, user_id, booking_date, spaces(title, host_id)")
      .eq("status", "pending")
      .not("slot_reserved_until", "is", null)
      .lte("slot_reserved_until", now);

    let expiredSlotsCount = 0;
    if (slotError) {
      console.error("[BOOKING-EXPIRY] Error fetching expired slots:", slotError);
    } else if (expiredSlots && expiredSlots.length > 0) {
      console.log(`[BOOKING-EXPIRY] Found ${expiredSlots.length} expired 15-min slot reservations`);

      for (const booking of expiredSlots) {
        // Cancella la prenotazione
        await supabaseAdmin
          .from("bookings")
          .update({
            status: "cancelled",
            cancelled_at: now,
            cancellation_reason: "Pagamento non completato entro 15 minuti dalla prenotazione",
          })
          .eq("id", booking.id);

        // Notifica il coworker
        await supabaseAdmin.from("notifications").insert({
          user_id: booking.user_id,
          type: "booking_cancelled",
          metadata: {
            booking_id: booking.id,
            space_title: booking.spaces?.[0]?.title,
            message: `La tua prenotazione per "${booking.spaces?.[0]?.title}" è stata annullata perché non hai completato il pagamento entro 15 minuti.`,
            reason: "slot_expired",
          },
        });

        console.log(`[BOOKING-EXPIRY] Cancelled expired slot booking ${booking.id}`);
        expiredSlotsCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_approvals: expiredApprovals?.length || 0,
        expired_payments: expiredPayments?.length || 0,
        expired_slots: expiredSlotsCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[BOOKING-EXPIRY] Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
