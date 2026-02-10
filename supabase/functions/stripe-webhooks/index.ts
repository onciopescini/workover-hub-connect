import { createClient } from "npm:@supabase/supabase-js@2.45.3";
import Stripe from "npm:stripe@16.5.0";
import { EnhancedCheckoutHandlers } from "./handlers/enhanced-checkout-handlers.ts";
import { AccountUpdatedHandler } from "./handlers/account-updated.ts";
import { SRELogger } from "../_shared/sre-logger.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

// Fail fast if secrets are missing
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

Deno.serve(async (req: Request) => {
  const correlationId = crypto.randomUUID();
  SRELogger.setCorrelationId(correlationId);
  
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!sig) {
    SRELogger.error("Missing stripe-signature header", { correlationId });
    return new Response(JSON.stringify({ error: "Missing signature" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
    
    SRELogger.info("Webhook event received", { 
      eventType: event.type, 
      eventId: event.id,
      correlationId 
    });

    // Route to enhanced handlers with idempotency protection
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const result = await EnhancedCheckoutHandlers.handleCheckoutSessionCompleted(
        session,
        supabase,
        event.id  // Pass event ID for idempotency check
      );
      
      if (!result.success) {
        SRELogger.warn("Checkout handler returned failure", { 
          error: result.error,
          sessionId: session.id,
          correlationId 
        });
        return new Response(JSON.stringify({ error: result.error }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      SRELogger.info("Checkout session processed successfully", { 
        sessionId: session.id,
        message: result.message,
        correlationId 
      });
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const result = await EnhancedCheckoutHandlers.handleCheckoutSessionExpired(
        session,
        supabase
      );
      
      if (!result.success) {
        SRELogger.warn("Expired session handler returned failure", { 
          error: result.error,
          sessionId: session.id,
          correlationId 
        });
      }
    } else if (event.type === "account.updated") {
      const result = await AccountUpdatedHandler.handle(event, supabase);

      if (!result.success) {
        const statusCode = result.statusCode ?? 500;

        SRELogger.warn("account.updated handler returned failure", {
          eventId: event.id,
          statusCode,
          error: result.error,
          correlationId,
        });

        return new Response(JSON.stringify({ error: result.error }), {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        });
      }

      SRELogger.info("account.updated processed", {
        eventId: event.id,
        duplicate: result.duplicate ?? false,
        correlationId,
      });
    } else {
      SRELogger.info("Unhandled event type (acknowledged)", { 
        eventType: event.type,
        correlationId 
      });
    }
    
    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown webhook error";

    SRELogger.error("Webhook processing error", { 
      error: errorMessage,
      correlationId 
    });

    return new Response(JSON.stringify({ error: `Webhook Error: ${errorMessage}` }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});
