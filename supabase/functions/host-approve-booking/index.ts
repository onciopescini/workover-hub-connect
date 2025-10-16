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

    // 1. AUTHENTICATION CHECK
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[HOST-APPROVE] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("[HOST-APPROVE] Invalid token:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log(`[HOST-APPROVE] Authenticated user: ${user.id}`);

    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 2. FETCH BOOKING WITH SPACE DETAILS
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, booking_date, start_time, end_time, space_id, request_invoice, spaces(title, host_id)")
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      console.error("[HOST-APPROVE] Booking not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // 3. VALIDATE HOST OWNERSHIP
    if (booking.spaces.host_id !== user.id) {
      console.error(`[HOST-APPROVE] Unauthorized: user ${user.id} is not host of space ${booking.space_id}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: You are not the host of this space" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (booking.status !== "pending_approval") {
      console.error("[HOST-APPROVE] Booking is not in pending_approval status:", booking.status);
      return new Response(
        JSON.stringify({ error: "Booking is not in pending_approval status" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // 4. CHECK SLOT AVAILABILITY
    const { data: conflictCheck, error: conflictError } = await supabaseAdmin.rpc(
      "check_slot_conflicts",
      {
        space_id_param: booking.space_id,
        date_param: booking.booking_date,
        start_time_param: booking.start_time,
        end_time_param: booking.end_time,
        exclude_booking_id: booking.id
      }
    );

    if (conflictError) {
      console.error("[HOST-APPROVE] Error checking conflicts:", conflictError);
      return new Response(
        JSON.stringify({ error: "Failed to verify slot availability" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (conflictCheck?.has_conflict) {
      console.error("[HOST-APPROVE] Slot conflict detected:", conflictCheck);
      return new Response(
        JSON.stringify({ 
          error: "Slot is no longer available due to conflicts",
          details: conflictCheck
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // 5. CALCULATE DYNAMIC PAYMENT DEADLINE
    // Italian requirements: 72h if invoice requested, otherwise 2h
    const now = new Date();
    const invoiceRequired = booking.request_invoice || false;
    const deadlineHours = invoiceRequired ? 72 : 2;
    const payment_deadline = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000).toISOString();
    
    console.log(`[HOST-APPROVE] Payment deadline: ${payment_deadline} (invoice required: ${invoiceRequired})`);

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

    // 6. SEND NOTIFICATION TO COWORKER
    const deadlineHoursText = invoiceRequired ? "72 ore" : "2 ore";
    await supabaseAdmin.from("user_notifications").insert({
      user_id: booking.user_id,
      type: "booking",
      title: "Prenotazione Approvata",
      content: `🎉 La tua prenotazione per "${booking.spaces.title}" è stata approvata! Completa il pagamento entro ${deadlineHoursText}.`,
      metadata: {
        booking_id: booking.id,
        space_title: booking.spaces.title,
        deadline: payment_deadline,
        payment_url: `/bookings?pay=${booking.id}`,
        action_required: "payment",
        urgent: !invoiceRequired, // urgent only for 2h deadline
        invoice_required: invoiceRequired,
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
