import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const requestSchema = z.object({
  booking_id: z.string().uuid(),
  reason: z.string().trim().min(1).max(500).optional(),
});

type RefundRequest = z.infer<typeof requestSchema>;

type PaymentRow = {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  payment_status: string;
};

type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "STRIPE_ERROR"
  | "IDEMPOTENT_REPLAY"
  | "INTERNAL_ERROR";

type ErrorResponse = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

type SuccessResponse = {
  success: true;
  data: {
    booking_id: string;
    payment_id: string;
    stripe_refund_id: string;
    stripe_refund_status: string;
    idempotency_key: string;
  };
};

const jsonResponse = <T>(
  body: T,
  status: number,
  requestOrigin: string | null,
): Response => {
  const headers = {
    ...getCorsHeaders(requestOrigin),
    "Content-Type": "application/json",
  };

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
};

const createErrorResponse = (
  requestOrigin: string | null,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): Response => {
  const payload: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };

  return jsonResponse(payload, status, requestOrigin);
};

const isStripeError = (error: unknown): error is Stripe.errors.StripeError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "message" in error &&
    typeof (error as { type: unknown }).type === "string" &&
    typeof (error as { message: unknown }).message === "string"
  );
};

const isIdempotentReplay = (error: Stripe.errors.StripeError): boolean => {
  const type = error.type.toLowerCase();
  const message = error.message.toLowerCase();
  return type.includes("idempotency") || message.includes("idempotent") || message.includes("idempotency");
};

const getRefundReason = (reason: string | undefined): Stripe.RefundCreateParams.Reason => {
  const normalized = reason?.toLowerCase() ?? "";
  if (normalized.includes("fraud")) {
    return "fraudulent";
  }

  return "requested_by_customer";
};

const isAdminUser = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> => {
  const payloadCandidates: ReadonlyArray<Record<string, string>> = [
    { user_id: userId },
    { p_user_id: userId },
    { _user_id: userId },
  ];

  for (const payload of payloadCandidates) {
    const { data, error } = await supabaseAdmin.rpc("is_admin", payload);
    if (!error && typeof data === "boolean") {
      return data;
    }
  }

  return false;
};

serve(async (req) => {
  const requestOrigin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(requestOrigin) });
  }

  if (req.method !== "POST") {
    return createErrorResponse(requestOrigin, 405, "VALIDATION_ERROR", "Method not allowed. Use POST.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !stripeSecretKey) {
    return createErrorResponse(
      requestOrigin,
      500,
      "INTERNAL_ERROR",
      "Missing required environment configuration.",
    );
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return createErrorResponse(requestOrigin, 401, "UNAUTHORIZED", "Authentication required.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const isAdmin = await isAdminUser(supabaseAdmin, user.id);

    if (!isAdmin) {
      return createErrorResponse(requestOrigin, 403, "FORBIDDEN", "Admin access required.");
    }

    const rawBody: unknown = await req.json();
    const parsedBody = requestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      const details = parsedBody.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      return createErrorResponse(requestOrigin, 400, "VALIDATION_ERROR", "Invalid request payload.", details);
    }

    const payload: RefundRequest = parsedBody.data;

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, booking_id, stripe_payment_intent_id, stripe_transfer_id, payment_status")
      .eq("booking_id", payload.booking_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single<PaymentRow>();

    if (paymentError || !payment) {
      return createErrorResponse(requestOrigin, 404, "NOT_FOUND", "Payment not found for booking.");
    }

    if (payment.payment_status === "refunded") {
      const alreadyRefundedResponse: SuccessResponse = {
        success: true,
        data: {
          booking_id: payload.booking_id,
          payment_id: payment.id,
          stripe_refund_id: "already_refunded",
          stripe_refund_status: "succeeded",
          idempotency_key: `refund_${payload.booking_id}_${payment.stripe_payment_intent_id ?? "missing_intent"}`,
        },
      };

      return jsonResponse(alreadyRefundedResponse, 200, requestOrigin);
    }

    if (!["completed", "succeeded"].includes(payment.payment_status)) {
      return createErrorResponse(
        requestOrigin,
        409,
        "CONFLICT",
        `Payment status '${payment.payment_status}' is not refundable.`,
      );
    }

    if (!payment.stripe_payment_intent_id) {
      return createErrorResponse(
        requestOrigin,
        400,
        "VALIDATION_ERROR",
        "Payment is missing stripe_payment_intent_id.",
      );
    }

    const idempotencyKey = `refund_${payload.booking_id}_${payment.stripe_payment_intent_id}`;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    console.info("[admin-process-refund] refund.start", {
      booking_id: payload.booking_id,
      payment_id: payment.id,
      idempotency_key: idempotencyKey,
      admin_id: user.id,
    });

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: payment.stripe_payment_intent_id,
      reason: getRefundReason(payload.reason),
      metadata: {
        booking_id: payload.booking_id,
        payment_id: payment.id,
        performed_by: user.id,
        admin_reason: payload.reason ?? "admin refund",
      },
    };

    let stripeRefund: Stripe.Response<Stripe.Refund>;

    try {
      stripeRefund = await stripe.refunds.create(refundParams, { idempotencyKey });
    } catch (error: unknown) {
      if (isStripeError(error)) {
        if (isIdempotentReplay(error)) {
          return createErrorResponse(
            requestOrigin,
            400,
            "IDEMPOTENT_REPLAY",
            "Idempotent replay: refund was already processed with this key.",
            { type: error.type, message: error.message },
          );
        }

        return createErrorResponse(requestOrigin, 400, "STRIPE_ERROR", error.message, {
          type: error.type,
          code: error.code,
        });
      }

      return createErrorResponse(requestOrigin, 500, "INTERNAL_ERROR", "Unexpected Stripe error.");
    }

    if (stripeRefund.status !== "succeeded" && stripeRefund.status !== "pending") {
      return createErrorResponse(
        requestOrigin,
        400,
        "STRIPE_ERROR",
        `Stripe refund returned unexpected status '${stripeRefund.status}'.`,
      );
    }

    console.info("[admin-process-refund] refund.success", {
      booking_id: payload.booking_id,
      stripe_refund_id: stripeRefund.id,
      stripe_refund_status: stripeRefund.status,
    });

    const bookingUpdatePromise = supabaseAdmin
      .from("bookings")
      .update({ status: "refunded" })
      .eq("id", payload.booking_id);

    const disputeUpdatePromise = supabaseAdmin
      .from("disputes")
      .update({ status: "resolved" })
      .eq("booking_id", payload.booking_id)
      .in("status", ["open", "in_review"]);

    const paymentUpdatePromise = supabaseAdmin
      .from("payments")
      .update({ payment_status: "refunded" })
      .eq("id", payment.id);

    const [bookingUpdate, disputeUpdate, paymentUpdate] = await Promise.all([
      bookingUpdatePromise,
      disputeUpdatePromise,
      paymentUpdatePromise,
    ]);

    console.info("[admin-process-refund] db.update.booking", {
      booking_id: payload.booking_id,
      error: bookingUpdate.error?.message ?? null,
    });

    console.info("[admin-process-refund] db.update.dispute", {
      booking_id: payload.booking_id,
      error: disputeUpdate.error?.message ?? null,
    });

    console.info("[admin-process-refund] db.update.payment", {
      payment_id: payment.id,
      error: paymentUpdate.error?.message ?? null,
    });

    if (bookingUpdate.error || disputeUpdate.error || paymentUpdate.error) {
      return createErrorResponse(
        requestOrigin,
        500,
        "INTERNAL_ERROR",
        "Refund executed on Stripe, but one or more database updates failed.",
        {
          booking_error: bookingUpdate.error?.message ?? null,
          dispute_error: disputeUpdate.error?.message ?? null,
          payment_error: paymentUpdate.error?.message ?? null,
          stripe_refund_id: stripeRefund.id,
        },
      );
    }

    const { error: auditError } = await supabaseAdmin.from("admin_actions_log").insert({
      admin_id: user.id,
      action_type: "refund_processed",
      target_type: "booking",
      target_id: payload.booking_id,
      description: "Refund processed by admin",
      metadata: {
        payment_id: payment.id,
        stripe_refund_id: stripeRefund.id,
        stripe_refund_status: stripeRefund.status,
        reason: payload.reason ?? null,
        idempotency_key: idempotencyKey,
      },
    });

    if (auditError) {
      console.error("[admin-process-refund] audit.insert.error", {
        booking_id: payload.booking_id,
        message: auditError.message,
      });
    }

    const successPayload: SuccessResponse = {
      success: true,
      data: {
        booking_id: payload.booking_id,
        payment_id: payment.id,
        stripe_refund_id: stripeRefund.id,
        stripe_refund_status: stripeRefund.status,
        idempotency_key: idempotencyKey,
      },
    };

    return jsonResponse(successPayload, 200, requestOrigin);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected internal error.";
    return createErrorResponse(requestOrigin, 500, "INTERNAL_ERROR", message);
  }
});
