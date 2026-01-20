
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";

// Import existing utilities and handlers to preserve other event functionality
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

  // Declare at handler scope so catch blocks can access it
  let existingEvent: any = null;

  try {
    ErrorHandler.logInfo('Webhook received', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // 1. Dependencies & Setup
    // Instantiate Stripe directly as requested, using the imported SDK
    const stripeApiKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

    if (!stripeApiKey) throw new Error('Missing STRIPE_SECRET_KEY');
    if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');

    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2023-10-16', // Explicit version or default to library version
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // 2. Event Listener & Security (Signature Verification)
    const requestClone = req.clone();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(JSON.stringify({ error: 'No signature' }), { status: 400, headers: corsHeaders });
    }

    const body = await requestClone.text();
    let event;

    try {
      // Use the direct stripe instance for verification
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      ErrorHandler.logError('Webhook signature verification failed', err);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: corsHeaders });
    }
    
    // Idempotency check
    const { data: eventData } = await supabaseAdmin
      .from('webhook_events')
      .select('id, status')
      .eq('event_id', event.id)
      .single();
    
    existingEvent = eventData;

    if (existingEvent?.status === 'processed') {
      ErrorHandler.logInfo('Event already processed', { eventId: event.id });
      return new Response(JSON.stringify({ received: true, status: 'already_processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Save event for idempotency
    if (!existingEvent) {
      const { data: insertedEvent, error: insertError } = await supabaseAdmin
        .from('webhook_events')
        .insert({
          event_id: event.id,
          event_type: event.type,
          payload: event,
          status: 'pending'
        })
        .select('id, status')
        .single();
      
      // Ignore duplicate key errors (23505)
      if (insertError && insertError.code !== '23505') {
        ErrorHandler.logError('Failed to save webhook event', insertError);
      }
      
      if (insertedEvent) {
        existingEvent = insertedEvent;
      }
    }

    ErrorHandler.logInfo('Processing Stripe webhook', { eventType: event.type });
    const startTime = Date.now();

    let result = { success: true, message: 'Processed' };

    switch (event.type) {
      case 'checkout.session.completed': {
        // 4. Database Action (New Logic)
        const session = event.data.object as any;

        ErrorHandler.logInfo('Processing checkout session completed (Revenue Sync)', {
            sessionId: session.id,
            amount: session.amount_total,
            currency: session.currency
        });

        const amountTotal = session.amount_total;
        const currency = session.currency;
        const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;
        const clientReferenceId = session.client_reference_id;
        const metadata = session.metadata || {};

        // Map user_id: Metadata first, then client_reference_id
        const userId = metadata.user_id || clientReferenceId;

        if (!userId) {
             ErrorHandler.logWarning('Missing user_id in session', { sessionId: session.id });
             throw new Error('Missing user_id in session metadata or client_reference_id');
        }

        // Upsert into public.payments
        const { error: upsertError } = await supabaseAdmin
          .from('payments')
          .upsert({
            stripe_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            user_id: userId,
            amount: amountTotal / 100, // Convert cents to unit
            currency: currency,
            payment_status_enum: 'succeeded',
            payment_status: 'completed', // Maintain legacy column compatibility
            booking_id: metadata.booking_id || null, // Preserve booking link if available
            method: 'stripe',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'stripe_session_id'
          });

        if (upsertError) {
             ErrorHandler.logError('Failed to upsert payment', upsertError);
             throw new Error(`Database upsert failed: ${upsertError.message}`);
        }

        // Call enhanced handler for side effects
        try {
            await EnhancedCheckoutHandlers.handleCheckoutSessionCompleted(session, supabaseAdmin, event.id);
        } catch (legacyError) {
            ErrorHandler.logWarning('Legacy handler failed (non-critical)', legacyError);
        }

        result = { success: true, message: 'Payment synced and legacy handler invoked' };
        break;
      }

      // Preserve other handlers
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
        // Restore full refund logic
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
                    payment_status: 'refunded'
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

    if (!result.success && (result as any).error) {
      throw new Error((result as any).error);
    }

    // Mark event as processed
    const { error: processedUpdateError } = await supabaseAdmin
      .from('webhook_events')
      .update({ 
        status: 'processed', 
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq(existingEvent?.id ? 'id' : 'event_id', existingEvent?.id ?? event.id);
    
    if (processedUpdateError) {
      ErrorHandler.logError('Failed to mark event as processed', processedUpdateError);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError('Webhook error', error);

    if (existingEvent?.id) {
        await supabaseAdmin.from('webhook_events').update({
            status: 'failed',
            last_error: error.message
        }).eq('id', existingEvent.id);
    }

    return new Response(
      JSON.stringify({ error: 'Webhook processing failed', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
