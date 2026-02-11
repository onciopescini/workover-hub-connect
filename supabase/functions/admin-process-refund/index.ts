import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const requestSchema = z
  .object({
    booking_id: z.string().uuid().optional(),
    bookingId: z.string().uuid().optional(),
    dispute_id: z.string().uuid().optional(),
    disputeId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(500).optional(),
    refundType: z.enum(["full", "partial"]).optional(),
    amount: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.booking_id && !data.bookingId && !data.dispute_id && !data.disputeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "booking_id (or bookingId) or dispute_id (or disputeId) is required",
      });
    }

    if (data.refundType === "partial" && typeof data.amount !== "number") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amount is required for partial refunds",
      });
    }
  });

type RefundRequest = z.infer<typeof requestSchema>;

type PaymentRow = {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  payment_status: string;
  amount: number;
};

type BookingHostRow = {
  id: string;
  space: {
    host: {
      id: string;
      stripe_connected: boolean | null;
      stripe_account_id: string | null;
    } | null;
  } | null;
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const getRefundReason = (reason: string | undefined): Stripe.RefundCreateParams.Reason => {
  if (!reason) {
    return "requested_by_customer";
  }

  const lowered = reason.toLowerCase();
  if (lowered.includes("fraud")) {
    return "fraudulent";
  }

  return "requested_by_customer";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc("is_admin", {
      p_user_id: user.id,
    });

    if (adminCheckError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized: Admin access required" }), { status: 403, headers: jsonHeaders });
    }

    const rawBody: unknown = await req.json();
    const parsedRequest = requestSchema.safeParse(rawBody);
    if (!parsedRequest.success) {
      return new Response(
        JSON.stringify({ error: parsedRequest.error.issues.map((issue) => issue.message).join("; ") }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const payload: RefundRequest = parsedRequest.data;
    const disputeId = payload.dispute_id ?? payload.disputeId ?? null;

    let bookingId = payload.booking_id ?? payload.bookingId ?? null;

    if (disputeId) {
      const { data: dispute, error: disputeError } = await supabaseAdmin
        .from("disputes")
        .select("id, booking_id, status")
        .eq("id", disputeId)
        .single();

      if (disputeError || !dispute) {
        return new Response(JSON.stringify({ error: "Dispute not found" }), { status: 404, headers: jsonHeaders });
      }

      if (dispute.status === "resolved") {
        return new Response(JSON.stringify({ error: "Dispute already resolved" }), { status: 400, headers: jsonHeaders });
      }

      bookingId = dispute.booking_id;
    }

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "booking_id is required" }), { status: 400, headers: jsonHeaders });
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, booking_id, stripe_payment_intent_id, stripe_transfer_id, payment_status, amount")
      .eq("booking_id", bookingId)
      .in("payment_status", ["completed", "succeeded"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single<PaymentRow>();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "No successful payment record found for this booking" }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    if (!payment.stripe_payment_intent_id) {
      return new Response(JSON.stringify({ error: "Payment is missing stripe_payment_intent_id" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { data: bookingWithHost, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        space:spaces!bookings_space_id_fkey (
          host:profiles!spaces_host_id_fkey (
            id,
            stripe_connected,
            stripe_account_id
          )
        )
      `)
      .eq("id", bookingId)
      .single<BookingHostRow>();

    if (bookingError || !bookingWithHost) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: jsonHeaders });
    }

    const host = bookingWithHost.space?.host;
    const isConnectPayment = Boolean(host?.stripe_connected && host?.stripe_account_id);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: payment.stripe_payment_intent_id,
      reason: getRefundReason(payload.reason),
      metadata: {
        booking_id: bookingId,
        dispute_id: disputeId ?? "",
        performed_by: user.id,
        admin_reason: payload.reason ?? "Admin approved refund",
      },
    };

    if (payload.refundType === "partial" && payload.amount) {
      refundParams.amount = payload.amount;
    }

    if (isConnectPayment || payment.stripe_transfer_id) {
      refundParams.reverse_transfer = true;
      refundParams.refund_application_fee = true;
    }

    const stripeRefund = await stripe.refunds.create(refundParams);

    if (stripeRefund.status !== "succeeded" && stripeRefund.status !== "pending") {
      return new Response(
        JSON.stringify({
          error: `Stripe refund not completed. Current status: ${stripeRefund.status}`,
          stripe_refund_id: stripeRefund.id,
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const { error: updateBookingError } = await supabaseAdmin
      .from("bookings")
      .update({ status: "refunded" })
      .eq("id", bookingId);

    if (updateBookingError) {
      return new Response(JSON.stringify({ error: "Refund completed, but failed to update booking status" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const { error: updateDisputeError } = await supabaseAdmin
      .from("disputes")
      .update({ status: "resolved" })
      .eq("booking_id", bookingId)
      .in("status", ["open", "in_review"]);

    if (updateDisputeError) {
      return new Response(JSON.stringify({ error: "Refund completed, but failed to update dispute status" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const { error: updatePaymentError } = await supabaseAdmin
      .from("payments")
      .update({ payment_status: "refunded" })
      .eq("id", payment.id);

    if (updatePaymentError) {
      return new Response(JSON.stringify({ error: "Refund completed, but failed to update payment status" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    await supabaseAdmin.from("admin_actions_log").insert({
      admin_id: user.id,
      action_type: "refund_processed",
      target_type: "booking",
      target_id: bookingId,
      description: "Refund processed by admin",
      metadata: {
        payment_id: payment.id,
        stripe_refund_id: stripeRefund.id,
        dispute_id: disputeId,
        reason: payload.reason ?? null,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: bookingId,
        dispute_id: disputeId,
        stripe_refund_id: stripeRefund.id,
        status: stripeRefund.status,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: jsonHeaders });
  }
});
