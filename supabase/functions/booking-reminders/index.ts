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
    console.log("[BOOKING-REMINDERS] Starting reminder check job");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

    // 1. Reminder per approvazioni che scadono tra 2h
    const { data: urgentApprovals, error: approvalError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, booking_date, approval_deadline, spaces(title, host_id)")
      .eq("status", "pending_approval")
      .eq("approval_reminder_sent", false)
      .lte("approval_deadline", twoHoursFromNow);

    if (approvalError) {
      console.error("[BOOKING-REMINDERS] Error fetching urgent approvals:", approvalError);
    } else if (urgentApprovals && urgentApprovals.length > 0) {
      console.log(`[BOOKING-REMINDERS] Found ${urgentApprovals.length} urgent approval requests`);

      for (const booking of urgentApprovals) {
        // Imposta flag urgente
        await supabaseAdmin
          .from("bookings")
          .update({
            is_urgent: true,
            approval_reminder_sent: true,
          })
          .eq("id", booking.id);

        // Notifica l'host
        await supabaseAdmin.from("user_notifications").insert({
          user_id: booking.spaces?.[0]?.host_id,
          type: "booking",
          title: "⏰ Richiesta urgente in scadenza",
          content: `Hai 2 ore per approvare/rifiutare la richiesta di prenotazione per "${booking.spaces?.[0]?.title}"!`,
          metadata: {
            booking_id: booking.id,
            space_title: booking.spaces?.[0]?.title,
            deadline: booking.approval_deadline,
            urgent: true,
          },
        });

        console.log(`[BOOKING-REMINDERS] Sent urgent approval reminder for booking ${booking.id}`);
      }
    }

    // 2. Reminder per pagamenti che scadono tra 2h
    const { data: urgentPayments, error: paymentError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, booking_date, payment_deadline, spaces(title)")
      .eq("status", "pending_payment")
      .eq("payment_reminder_sent", false)
      .lte("payment_deadline", twoHoursFromNow);

    if (paymentError) {
      console.error("[BOOKING-REMINDERS] Error fetching urgent payments:", paymentError);
    } else if (urgentPayments && urgentPayments.length > 0) {
      console.log(`[BOOKING-REMINDERS] Found ${urgentPayments.length} urgent payment requests`);

      for (const booking of urgentPayments) {
        // Imposta flag reminder inviato
        await supabaseAdmin
          .from("bookings")
          .update({
            payment_reminder_sent: true,
          })
          .eq("id", booking.id);

        // Notifica il coworker con link diretto al pagamento
        await supabaseAdmin.from("notifications").insert({
          user_id: booking.user_id,
          type: "booking",
          metadata: {
            booking_id: booking.id,
            space_title: booking.spaces?.[0]?.title,
            message: `⚠️ La tua prenotazione per "${booking.spaces?.[0]?.title}" è stata approvata! Completa il pagamento entro 2h o perderai la prenotazione.`,
            deadline: booking.payment_deadline,
            urgent: true,
            payment_url: `/bookings?pay=${booking.id}`,
            action_required: "payment",
          },
        });

        console.log(`[BOOKING-REMINDERS] Sent urgent payment reminder for booking ${booking.id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        approval_reminders: urgentApprovals?.length || 0,
        payment_reminders: urgentPayments?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[BOOKING-REMINDERS] Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
