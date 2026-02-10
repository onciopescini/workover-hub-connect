import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { corsHeaders } from "../_shared/cors.ts";
import { calculateRefund } from "../_shared/policy-calculator.ts";

interface CancellationRequest {
  booking_id: string;
  reason?: string;
  idempotency_key?: string;
}

interface BookingRecord {
  id: string;
  user_id: string;
  space_id: string;
  status: string;
  booking_date: string;
  start_time: string | null;
  cancellation_policy: string | null;
  stripe_payment_intent_id: string | null;
  payments: PaymentRecord[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  stripe_payment_intent_id: string | null;
  payment_status: string;
}

interface SpaceRecord {
  host_id: string;
  title: string;
}

console.log("[handle-booking-cancellation] Function ready");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!stripeKey || !supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Missing required environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = (await req.json()) as CancellationRequest;
    if (!body.booking_id) {
      return new Response(JSON.stringify({ error: "booking_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: bookingData, error: bookingError } = await serviceClient
      .from("bookings")
      .select(`
        id,
        user_id,
        space_id,
        status,
        booking_date,
        start_time,
        cancellation_policy,
        stripe_payment_intent_id,
        payments (
          id,
          amount,
          stripe_payment_intent_id,
          payment_status
        )
      `)
      .eq("id", body.booking_id)
      .single<BookingRecord>();

    if (bookingError || !bookingData) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (bookingData.status === "cancelled") {
      return new Response(JSON.stringify({ success: true, idempotent: true, message: "Booking already cancelled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: spaceData, error: spaceError } = await serviceClient
      .from("spaces")
      .select("host_id, title")
      .eq("id", bookingData.space_id)
      .single<SpaceRecord>();

    if (spaceError || !spaceData) {
      return new Response(JSON.stringify({ error: "Space not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const isGuest = bookingData.user_id === user.id;
    const isHost = spaceData.host_id === user.id;

    if (!isGuest && !isHost) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const cancelledByHost = isHost;
    const idempotencyKey = body.idempotency_key ?? `booking-cancel:${bookingData.id}:${user.id}`;
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const payment = bookingData.payments.find((entry) => entry.payment_status === "completed");
    const paymentIntentId = payment?.stripe_payment_intent_id ?? bookingData.stripe_payment_intent_id;

    let action: "none" | "auth_released" | "refunded" = "none";
    let refundAmount = 0;

    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });

      if (paymentIntent.status === "requires_capture") {
        await stripe.paymentIntents.cancel(paymentIntentId, {}, { idempotencyKey: `${idempotencyKey}:cancel-auth` });
        action = "auth_released";
      } else if (paymentIntent.status === "succeeded") {
        const bookingDateTime = new Date(`${bookingData.booking_date}T${bookingData.start_time ?? "00:00:00"}`);
        const cancellationPolicy = bookingData.cancellation_policy ?? "moderate";

        const refundRatio = cancelledByHost
          ? 1
          : 1 - (calculateRefund(100, cancellationPolicy, bookingDateTime, new Date()).penaltyPercentage / 100);

        const amountToRefund = Math.max(0, Math.round(paymentIntent.amount * refundRatio));

        if (amountToRefund > 0) {
          const refund = await stripe.refunds.create(
            {
              payment_intent: paymentIntentId,
              amount: amountToRefund,
              reverse_transfer: true,
              refund_application_fee: false,
              metadata: {
                booking_id: bookingData.id,
                cancelled_by_host: String(cancelledByHost),
                idempotency_key: idempotencyKey,
              },
            },
            { idempotencyKey: `${idempotencyKey}:refund` },
          );

          action = "refunded";
          refundAmount = (refund.amount ?? amountToRefund) / 100;
        }
      }
    }

    const { error: finalizeError } = await serviceClient.rpc("finalize_booking_cancellation_secure", {
      booking_id_param: bookingData.id,
      cancelled_by_host_param: cancelledByHost,
      reason_param: body.reason ?? (cancelledByHost ? "Cancelled by host" : "Cancelled by guest"),
      action_param: action,
    });

    if (finalizeError) {
      throw new Error(`Finalize cancellation failed: ${finalizeError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, action, refund_amount: refundAmount, idempotency_key: idempotencyKey }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[handle-booking-cancellation]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
