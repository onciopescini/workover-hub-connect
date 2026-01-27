// supabase/functions/create-checkout-v3/index.ts
// Deno.serve + CORS + Idempotency + Stripe via fetch + robust error handling
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

type CreateCheckoutBody = { booking_id: string; /* UUID */ };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!; // già configurato

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey, prefer, Idempotency-Key",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
  "Connection": "keep-alive",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function err(message: string, status = 400, details?: unknown) {
  const payload: Record<string, unknown> = { error: message };
  if (details !== undefined) payload.details = details;
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

async function getUserFromAuth(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function fetchBookingAndPrice(booking_id: string, user_id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, user_id, status, total_price")
    .eq("id", booking_id)
    .single();

  if (error || !data) return { error: "booking_not_found" };
  if (data.user_id !== user_id) return { error: "forbidden" };
  if (data.status !== "pending_payment") return { error: "invalid_booking_status" };

  const amountCents = Math.max(0, Math.round(Number(data.total_price) * 100));
  const currency = "eur";
  return { booking: data, amountCents, currency };
}

async function findPaymentByIdempotencyKey(key: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, stripe_session_id, stripe_payment_intent_id, payment_status_enum, payment_status, booking_id, user_id, amount, currency")
    .eq("stripe_idempotency_key", key)
    .maybeSingle();

  if (error) return { error: "db_read_error" };
  return { payment: data ?? null };
}

async function upsertPayment(params: {
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  stripe_idempotency_key: string;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  payment_status_enum?: "pending" | "requires_action" | "succeeded" | "failed" | "refunded" | "canceled";
}) {
  const insert = {
    booking_id: params.booking_id,
    user_id: params.user_id,
    amount: params.amount,
    currency: params.currency,
    stripe_idempotency_key: params.stripe_idempotency_key,
    stripe_session_id: params.stripe_session_id ?? null,
    stripe_payment_intent_id: params.stripe_payment_intent_id ?? null,
    payment_status_enum: params.payment_status_enum ?? "pending",
    payment_status: params.payment_status_enum ?? "pending",
  };

  const { data, error } = await supabase
    .from("payments")
    .upsert(insert, { onConflict: "stripe_idempotency_key" })
    .select("id, stripe_session_id, stripe_payment_intent_id, payment_status_enum, payment_status, booking_id, user_id, amount, currency")
    .single();

  if (error || !data) return { error: "db_upsert_error" };
  return { payment: data };
}

async function createStripeCheckoutSession(params: {
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  booking_id: string;
}) {
  const body = new URLSearchParams({
    mode: "payment",
    "payment_method_types[]": "card",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": params.currency,
    "line_items[0][price_data][unit_amount]": String(params.amountCents),
    "line_items[0][price_data][product_data][name]": `Booking ${params.booking_id}`,
    success_url: `${SUPABASE_URL}/functions/v1/validate-payment?booking_id=${params.booking_id}&status=success`,
    cancel_url: `${SUPABASE_URL}/functions/v1/validate-payment?booking_id=${params.booking_id}&status=cancel`,
    "metadata[booking_id]": params.booking_id,
  });

  const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": params.idempotencyKey,
    },
    body,
  });

  const text = await resp.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: "stripe_invalid_response", status: resp.status, raw: text };
  }
  if (!resp.ok) {
    return { error: "stripe_error", status: resp.status, details: json };
  }

  const sessionId = json.id as string | undefined;
  const paymentIntentId = json.payment_intent as string | undefined;
  const url = json.url as string | undefined;

  if (!sessionId) return { error: "stripe_no_session_id", details: json };
  return {
    session: {
      id: sessionId,
      payment_intent_id: paymentIntentId ?? null,
      url: url ?? null,
    },
  };
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: CORS_HEADERS });
    }
    if (req.method !== "POST") {
      return err("method_not_allowed", 405);
    }

    const idempotencyKey = req.headers.get("Idempotency-Key") || "";
    if (!idempotencyKey) return err("missing_idempotency_key", 400);

    const user = await getUserFromAuth(req);
    if (!user) return err("unauthorized", 401);

    let payload: CreateCheckoutBody;
    try {
      payload = await req.json();
    } catch {
      return err("invalid_json", 400);
    }

    if (!payload.booking_id) return err("missing_booking_id", 400);

    // 1) Idempotency lookup
    const existing = await findPaymentByIdempotencyKey(idempotencyKey);
    if ("error" in existing) return err(existing.error!, 500);

    if (existing.payment) {
      return ok({
        idempotent: true,
        payment: {
          id: existing.payment.id,
          stripe_session_id: existing.payment.stripe_session_id,
          stripe_payment_intent_id: existing.payment.stripe_payment_intent_id,
          status: existing.payment.payment_status_enum ?? existing.payment.payment_status,
          amount: existing.payment.amount,
          currency: existing.payment.currency,
          booking_id: existing.payment.booking_id,
        },
      });
    }

    // 2) Server-side booking/amount
    const bookingRes = await fetchBookingAndPrice(payload.booking_id, user.id);
    if ("error" in bookingRes) return err(bookingRes.error!, 400);

    // 3) Stripe session with Idempotency-Key
    const stripe = await createStripeCheckoutSession({
      amountCents: bookingRes.amountCents!,
      currency: bookingRes.currency!,
      idempotencyKey,
      booking_id: payload.booking_id,
    });
    if ("error" in stripe) return err(stripe.error!, 400, stripe);

    // 4) Upsert payment
    const upsert = await upsertPayment({
      booking_id: payload.booking_id,
      user_id: user.id,
      amount: bookingRes.amountCents!,
      currency: bookingRes.currency!,
      stripe_idempotency_key: idempotencyKey,
      stripe_session_id: stripe.session!.id,
      stripe_payment_intent_id: stripe.session!.payment_intent_id,
      payment_status_enum: "pending",
    });
    if ("error" in upsert) return err(upsert.error!, 500);

    return ok({
      idempotent: false,
      checkout_session: {
        id: stripe.session!.id,
        url: stripe.session!.url,
      },
      payment: {
        id: upsert.payment!.id,
        stripe_session_id: upsert.payment!.stripe_session_id,
        stripe_payment_intent_id: upsert.payment!.stripe_payment_intent_id,
        status: upsert.payment!.payment_status_enum ?? upsert.payment!.payment_status,
        amount: upsert.payment!.amount,
        currency: upsert.payment!.currency,
        booking_id: upsert.payment!.booking_id,
      },
    });
  } catch (e) {
    console.error("create-checkout-v3 fatal:", e);
    return err("internal_error", 500);
  }
});
