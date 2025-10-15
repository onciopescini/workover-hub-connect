
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { StripeConfig } from "./utils/stripe-config.ts";
import { ErrorHandler } from "./utils/error-handler.ts";
import { WebhookValidator } from "./handlers/webhook-validator.ts";
import { EnhancedCheckoutHandlers } from "./handlers/enhanced-checkout-handlers.ts";
import { PaymentHandlers } from "./handlers/payment-handlers.ts";
import { AccountHandlers } from "./handlers/account-handlers.ts";
import { ChargeHandlers } from "./handlers/charge-handlers.ts";
import { TransferHandlers } from "./handlers/transfer-handlers.ts";

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
    ErrorHandler.logInfo('Webhook received', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    const stripe = StripeConfig.getInstance();
    const webhookSecret = StripeConfig.getWebhookSecret();
    
    // Clone request to preserve body for signature validation
    const requestClone = req.clone();
    const validationResult = await WebhookValidator.validateWebhookSignature(requestClone, stripe, webhookSecret);
    
    if (!validationResult.success) {
      ErrorHandler.logError('Webhook validation failed', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Webhook validation failed', 
          details: validationResult.error 
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const event = validationResult.event!;
    ErrorHandler.logInfo('Processing Stripe webhook', { eventType: event.type });

    let result;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        result = await EnhancedCheckoutHandlers.handleCheckoutSessionCompleted(session, supabaseAdmin, event.id);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as any;
        result = await EnhancedCheckoutHandlers.handleCheckoutSessionExpired(session, supabaseAdmin);
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

      case 'charge.succeeded': {
        const charge = event.data.object as any;
        result = await ChargeHandlers.handleChargeSucceeded(charge, supabaseAdmin);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as any;
        result = await ChargeHandlers.handleChargeRefunded(charge, supabaseAdmin);
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as any;
        result = await TransferHandlers.handleTransferCreated(transfer, supabaseAdmin);
        break;
      }

      case 'payout.created': {
        const payout = event.data.object as any;
        result = await TransferHandlers.handlePayoutCreated(payout, supabaseAdmin);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        const bookingId = paymentIntent.metadata?.booking_id;

        if (bookingId) {
          // Check for refund_pending payments
          const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('id, amount, booking_id, bookings(cancellation_fee, cancelled_by_host)')
            .eq('booking_id', bookingId)
            .eq('payment_status', 'refund_pending')
            .single();

          if (payment) {
            ErrorHandler.logInfo('Processing automatic refund for refund_pending payment', { paymentIntentId: paymentIntent.id, bookingId });

            const booking = payment.bookings as any;
            let refundAmount;
            
            if (booking?.cancelled_by_host) {
              // Host cancels: full refund
              refundAmount = payment.amount;
            } else {
              // Coworker cancels: refund - penalty
              const fee = booking?.cancellation_fee || 0;
              refundAmount = payment.amount - fee;
            }

            // Convert to cents for Stripe
            const refundAmountCents = Math.round(refundAmount * 100);

            if (refundAmountCents > 0) {
              try {
                const refund = await stripe.refunds.create({
                  payment_intent: paymentIntent.id,
                  amount: refundAmountCents,
                  reason: 'requested_by_customer',
                });

                ErrorHandler.logSuccess('Refund created', { refundId: refund.id, amount: refundAmount });

                await supabaseAdmin
                  .from('payments')
                  .update({
                    payment_status: 'refunded',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', payment.id);

                ErrorHandler.logSuccess('Payment status updated to refunded', { paymentId: payment.id });
              } catch (refundError) {
                ErrorHandler.logError('Refund failed', refundError);
              }
            }
          }
        }

        result = { success: true };
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

    ErrorHandler.logSuccess('Webhook processed successfully', { eventType: event.type });

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
