
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { StripeConfig } from "./utils/stripe-config.ts";
import { ErrorHandler } from "./utils/error-handler.ts";
import { WebhookValidator } from "./handlers/webhook-validator.ts";
import { CheckoutHandlers } from "./handlers/checkout-handlers.ts";
import { PaymentHandlers } from "./handlers/payment-handlers.ts";
import { AccountHandlers } from "./handlers/account-handlers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = StripeConfig.getInstance();
    const webhookSecret = StripeConfig.getWebhookSecret();
    
    const validationResult = await WebhookValidator.validateWebhookSignature(req, stripe, webhookSecret);
    
    if (!validationResult.success) {
      return new Response(validationResult.error, { status: 400 });
    }

    const event = validationResult.event!;
    ErrorHandler.logInfo('Processing Stripe webhook', { eventType: event.type });

    let result;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        result = await CheckoutHandlers.handleCheckoutSessionCompleted(session, supabaseAdmin);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as any;
        result = await CheckoutHandlers.handleCheckoutSessionExpired(session, supabaseAdmin);
        break;
      }

      case 'refund.created': {
        const refund = event.data.object as any;
        result = await PaymentHandlers.handleRefundCreated(refund, supabaseAdmin);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as any;
        result = await AccountHandlers.handleAccountUpdated(account, supabaseAdmin);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        result = await PaymentHandlers.handlePaymentIntentFailed(paymentIntent, supabaseAdmin);
        break;
      }

      default:
        ErrorHandler.logInfo('Unhandled webhook event type', { eventType: event.type });
        result = { success: true, message: 'Event type not handled' };
    }

    if (!result.success) {
      ErrorHandler.logError('Webhook processing failed', result.error);
      return new Response(
        JSON.stringify({ 
          error: 'Webhook processing failed',
          details: result.error 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError('Webhook error', error, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
