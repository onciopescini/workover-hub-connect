// supabase/functions/create-checkout-v3/index.ts
// Deno.serve + CORS + Idempotency + Stripe via fetch + robust error handling
// DUAL FEE MODEL: 5% Guest Fee + 22% VAT + 5% Host Fee
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { PricingEngine } from "../_shared/pricing-engine.ts";

type CreateCheckoutBody = { 
  booking_id: string; /* UUID */
  origin?: string;    // Frontend origin for redirect URLs
};

type BookingWithHost = {
  id: string;
  user_id: string;
  status: string;
  total_price: number;
  space_id: string;
  hostStripeAccountId: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

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
  // Fetch booking with space and host's Stripe account
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, user_id, status, total_price, space_id,
      spaces!inner (
        host_id,
        profiles:host_id (stripe_account_id)
      )
    `)
    .eq("id", booking_id)
    .single();

  if (error || !data) return { error: "booking_not_found" };
  if (data.user_id !== user_id) return { error: "forbidden" };
  if (data.status !== "pending_payment") return { error: "invalid_booking_status" };

  // Extract host's Stripe account ID from nested join
  const spaces = data.spaces as any;
  const hostStripeAccountId = spaces?.profiles?.stripe_account_id || null;

  // Base price is what the host set (before fees)
  const basePrice = Number(data.total_price);
  
  // Calculate full pricing breakdown using the shared engine
  const pricing = PricingEngine.calculatePricing(basePrice);

  return { 
    booking: {
      ...data,
      hostStripeAccountId,
    } as BookingWithHost,
    basePrice,
    pricing,
    spaceId: data.space_id 
  };
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
  totalChargeCents: number;
  applicationFeeCents: number;
  currency: string;
  idempotencyKey: string;
  booking_id: string;
  user_id: string;
  origin: string;
  space_id: string;
  hostStripeAccountId: string | null;
  basePrice: number;
  hostPayout: number;
  platformFee: number;
}) {
  // Fallback to production URL if origin not provided
  const frontendOrigin = params.origin || 'https://workover-hub-connect.lovable.app';
  
  // Build base checkout params
  const body = new URLSearchParams({
    mode: "payment",
    "payment_method_types[]": "card",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": params.currency,
    "line_items[0][price_data][unit_amount]": String(params.totalChargeCents),
    "line_items[0][price_data][product_data][name]": `Prenotazione Spazio`,
    success_url: `${frontendOrigin}/spaces/${params.space_id}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendOrigin}/bookings?canceled=true&booking_id=${params.booking_id}`,
    // Critical metadata for webhook processing
    "metadata[booking_id]": params.booking_id,
    "metadata[user_id]": params.user_id,
    "metadata[base_amount]": String(params.basePrice),
    "metadata[host_net_payout]": String(params.hostPayout),
    "metadata[total_platform_fee]": String(params.platformFee),
  });

  // STRIPE CONNECT: Only add if host has connected Stripe account
  if (params.hostStripeAccountId) {
    body.append("payment_intent_data[application_fee_amount]", String(params.applicationFeeCents));
    body.append("payment_intent_data[transfer_data][destination]", params.hostStripeAccountId);
    console.log(`[STRIPE CONNECT] Routing to host: ${params.hostStripeAccountId}, app_fee: ${params.applicationFeeCents} cents`);
  } else {
    console.log(`[STRIPE] No host Stripe account - platform collects full amount`);
  }

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

    // 2) Server-side booking/amount with pricing calculation
    const bookingRes = await fetchBookingAndPrice(payload.booking_id, user.id);
    if ("error" in bookingRes) return err(bookingRes.error!, 400);

    const { pricing, basePrice, booking } = bookingRes;
    
    // Convert to cents for Stripe
    const totalChargeCents = Math.round(pricing.totalGuestPay * 100);
    const applicationFeeCents = Math.round(pricing.applicationFee * 100);

    console.log(`[PRICING] Base: €${basePrice}, Guest Pays: €${pricing.totalGuestPay}, Host Gets: €${pricing.hostPayout}, Platform: €${pricing.applicationFee}`);

    // Get origin from request for redirect URLs
    const origin = req.headers.get('origin') || payload.origin || 'https://workover-hub-connect.lovable.app';

    // 3) Stripe session with Idempotency-Key + Connect params
    const stripe = await createStripeCheckoutSession({
      totalChargeCents,
      applicationFeeCents,
      currency: "eur",
      idempotencyKey,
      booking_id: payload.booking_id,
      user_id: user.id,
      origin,
      space_id: bookingRes.spaceId!,
      hostStripeAccountId: booking.hostStripeAccountId,
      basePrice,
      hostPayout: pricing.hostPayout,
      platformFee: pricing.applicationFee,
    });
    if ("error" in stripe) return err(stripe.error!, 400, stripe);

    // 4) Upsert payment with pricing breakdown
    const upsert = await upsertPayment({
      booking_id: payload.booking_id,
      user_id: user.id,
      amount: totalChargeCents,
      currency: "eur",
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
