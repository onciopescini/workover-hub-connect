
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";

import { validateWebhookSignature } from "./webhook-validator.ts";
import { handleCheckoutSessionCompleted, handleCheckoutSessionExpired } from "./checkout-handlers.ts";
import { handleRefundCreated, handlePaymentIntentFailed } from "./payment-handlers.ts";
import { handleAccountUpdated } from "./account-handlers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
    const validationResult = await validateWebhookSignature(req, stripe, webhookSecret);
    
    if (!validationResult.success) {
      return new Response(validationResult.error, { status: 400 });
    }

    const event = validationResult.event!;
    console.log('🔵 Processing Stripe webhook:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session, supabaseAdmin);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionExpired(session, supabaseAdmin);
        break;
      }

      case 'refund.created': {
        const refund = event.data.object as Stripe.Refund;
        await handleRefundCreated(refund, supabaseAdmin);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account, supabaseAdmin);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent, supabaseAdmin);
        break;
      }

      default:
        console.log('🔵 Unhandled webhook event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('🔴 Webhook error:', error);
    console.error('Error details:', {
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
