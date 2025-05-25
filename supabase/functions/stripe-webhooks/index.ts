
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
  Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response('Missing signature', { status: 400 });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    console.log('Processing Stripe webhook:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);
        
        // Update payment status
        if (session.metadata?.booking_id) {
          const { error: paymentError } = await supabaseAdmin
            .from('payments')
            .update({ 
              payment_status: 'completed',
              receipt_url: session.receipt_url 
            })
            .eq('id', session.metadata.booking_id);

          if (paymentError) {
            console.error('Error updating payment:', paymentError);
          }

          // Update booking status
          const { error: bookingError } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', session.metadata.booking_id);

          if (bookingError) {
            console.error('Error updating booking:', bookingError);
          }

          // Send confirmation email
          if (session.customer_email) {
            await supabaseAdmin.functions.invoke('send-email', {
              body: {
                type: 'booking_confirmation',
                to: session.customer_email,
                data: {
                  booking_id: session.metadata.booking_id,
                  amount: session.amount_total,
                  currency: session.currency
                }
              }
            });
          }
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('Stripe account updated:', account.id);
        
        // Check if account is verified
        const isVerified = account.charges_enabled && account.payouts_enabled;
        
        // Find and update host profile
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            stripe_connected: isVerified,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', account.id);

        if (error) {
          console.error('Error updating host stripe status:', error);
        } else {
          console.log('Host stripe status updated successfully');
        }
        break;
      }

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
