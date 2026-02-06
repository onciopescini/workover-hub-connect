import { createClient } from "npm:@supabase/supabase-js@2.45.3";
import Stripe from "npm:stripe@16.5.0";

type WebhookStatus = "pending" | "processed" | "failed";

type StripeWebhookRow = {
  id: string;
  event_id: string;
  status: WebhookStatus;
};

type CheckoutMetadata = {
  space_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

const jsonHeaders = { "Content-Type": "application/json" };

const parseCheckoutMetadata = (metadata: Stripe.Metadata | null): CheckoutMetadata => {
  const spaceId = metadata?.space_id;
  const userId = metadata?.user_id;
  const startDate = metadata?.start_date;
  const endDate = metadata?.end_date;

  if (!spaceId || !userId || !startDate || !endDate) {
    throw new Error("Missing required checkout metadata: space_id, user_id, start_date, end_date");
  }

  return {
    space_id: spaceId,
    user_id: userId,
    start_date: startDate,
    end_date: endDate,
  };
};

const markWebhookAsFailed = async (eventId: string, errorMessage: string): Promise<void> => {
  await supabase
    .from("stripe_webhooks")
    .update({ status: "failed", error_message: errorMessage })
    .eq("event_id", eventId);
};

Deno.serve(async (req: Request): Promise<Response> => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Signature verification failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const { data: existingWebhook, error: readError } = await supabase
    .from("stripe_webhooks")
    .select("id, event_id, status")
    .eq("event_id", event.id)
    .maybeSingle<StripeWebhookRow>();

  if (readError) {
    return new Response(JSON.stringify({ error: readError.message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (existingWebhook?.status === "processed") {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  if (!existingWebhook) {
    const { error: insertWebhookError } = await supabase
      .from("stripe_webhooks")
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: JSON.parse(body),
        status: "pending",
      });

    if (insertWebhookError) {
      if (insertWebhookError.code === "23505") {
        const { data: conflictWebhook } = await supabase
          .from("stripe_webhooks")
          .select("status")
          .eq("event_id", event.id)
          .maybeSingle<{ status: WebhookStatus }>();

        if (conflictWebhook?.status === "processed") {
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            status: 200,
            headers: jsonHeaders,
          });
        }
      } else {
        return new Response(JSON.stringify({ error: insertWebhookError.message }), {
          status: 500,
          headers: jsonHeaders,
        });
      }
    }
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = parseCheckoutMetadata(session.metadata ?? null);

      const { error: bookingInsertError } = await supabase.from("bookings").insert({
        space_id: metadata.space_id,
        user_id: metadata.user_id,
        booking_date: metadata.start_date,
        status: "confirmed",
      });

      if (bookingInsertError) {
        throw new Error(bookingInsertError.message);
      }
    }

    const { error: processedError } = await supabase
      .from("stripe_webhooks")
      .update({ status: "processed", error_message: null })
      .eq("event_id", event.id);

    if (processedError) {
      return new Response(JSON.stringify({ error: processedError.message }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await markWebhookAsFailed(event.id, message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
