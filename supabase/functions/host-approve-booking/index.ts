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
    console.log("[HOST-APPROVE] Starting host approval process");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Recupera booking con dettagli spazio
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, booking_date, spaces(title, host_id)")
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      console.error("[HOST-APPROVE] Booking not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (booking.status !== "pending_approval") {
      console.error("[HOST-APPROVE] Booking is not in pending_approval status:", booking.status);
      return new Response(
        JSON.stringify({ error: "Booking is not in pending_approval status" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const now = new Date();
    const payment_deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // +2h

    // Aggiorna booking a pending_payment
    const { error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "pending_payment",
        payment_deadline,
        updated_at: now.toISOString(),
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error("[HOST-APPROVE] Error updating booking:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update booking" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Notifica immediata al coworker con link di pagamento
    await supabaseAdmin.from("notifications").insert({
      user_id: booking.user_id,
      type: "booking",
      metadata: {
        booking_id: booking.id,
        space_title: booking.spaces.title,
        message: `🎉 La tua prenotazione per "${booking.spaces.title}" è stata approvata! Completa il pagamento entro 2 ore.`,
        deadline: payment_deadline,
        payment_url: `/bookings?pay=${booking.id}`,
        action_required: "payment",
        urgent: false,
      },
    });

    console.log(`[HOST-APPROVE] Booking ${booking_id} approved and notification sent`);

    return new Response(
      JSON.stringify({ success: true, booking_id, payment_deadline }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[HOST-APPROVE] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
