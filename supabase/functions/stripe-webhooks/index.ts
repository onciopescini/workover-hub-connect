
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

    console.log('🔵 Processing Stripe webhook:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('🔵 Checkout session completed:', session.id);
        
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
            console.error('🔴 Error updating payment:', paymentError);
          } else {
            console.log('✅ Payment updated successfully');
          }

          // Update booking status
          const { error: bookingError } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', session.metadata.booking_id);

          if (bookingError) {
            console.error('🔴 Error updating booking:', bookingError);
          } else {
            console.log('✅ Booking confirmed successfully');
          }

          // Send confirmation email
          if (session.customer_email) {
            try {
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
              console.log('✅ Confirmation email sent');
            } catch (emailError) {
              console.error('🔴 Failed to send confirmation email:', emailError);
            }
          }
        }
        break;
      }

      case 'refund.created': {
        // Gestione rimborsi da spazi sospesi
        const refund = event.data.object as Stripe.Refund;
        console.log('🔵 Refund created:', refund.id);
        
        // Cerca il pagamento corrispondente usando il payment_intent
        const { data: payment, error: paymentError } = await supabaseAdmin
          .from('payments')
          .select('booking_id, user_id')
          .eq('stripe_session_id', refund.payment_intent)
          .single();
          
        if (paymentError) {
          console.error('🔴 Error finding payment:', paymentError);
          break;
        }
        
        if (payment) {
          // Aggiorna lo stato del pagamento
          await supabaseAdmin
            .from('payments')
            .update({ payment_status: 'refunded' })
            .eq('stripe_session_id', refund.payment_intent);
          
          // Notifica l'utente del rimborso completato
          await supabaseAdmin
            .from('user_notifications')
            .insert({
              user_id: payment.user_id,
              type: 'booking',
              title: 'Rimborso completato',
              content: 'Il rimborso per la prenotazione cancellata è stato elaborato con successo',
              metadata: {
                booking_id: payment.booking_id,
                refund_amount: refund.amount / 100,
                currency: refund.currency
              }
            });
          
          console.log('✅ Refund processed and user notified');
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('🔵 Stripe account updated:', account.id);
        
        // Check if account is verified and can accept payments
        const isVerified = account.charges_enabled && account.payouts_enabled;
        
        console.log('🔵 Account verification status:', {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          isVerified
        });
        
        // Find and update host profile by stripe_account_id
        const { data: profiles, error: findError } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('stripe_account_id', account.id);

        if (findError) {
          console.error('🔴 Error finding profile by stripe_account_id:', findError);
          break;
        }

        if (!profiles || profiles.length === 0) {
          console.log('🔴 No profile found for Stripe account:', account.id);
          break;
        }

        const profile = profiles[0];
        console.log('🔵 Updating profile for user:', profile.id, 'isVerified:', isVerified);

        // Update the stripe_connected status - FIX PRINCIPALE
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            stripe_connected: isVerified,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error('🔴 Error updating host stripe status:', updateError);
        } else {
          console.log('✅ Host stripe status updated successfully:', {
            userId: profile.id,
            stripeConnected: isVerified
          });

          // Send notification email to host about successful setup
          if (isVerified) {
            try {
              // Get user email from auth
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
              
              if (authUser?.user?.email) {
                await supabaseAdmin.functions.invoke('send-email', {
                  body: {
                    type: 'stripe_setup_complete',
                    to: authUser.user.email,
                    data: {
                      firstName: profile.first_name,
                      dashboardUrl: `${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://workover.app'}/host/dashboard`
                    }
                  }
                });
                console.log('✅ Stripe setup completion email sent');
              }
            } catch (emailError) {
              console.error('🔴 Failed to send Stripe setup completion email:', emailError);
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        // Gestione errori di pagamento
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('🔴 Payment failed:', paymentIntent.id, paymentIntent.last_payment_error?.message);
        
        // Update payment status to failed
        const { error: paymentError } = await supabaseAdmin
          .from('payments')
          .update({ payment_status: 'failed' })
          .eq('stripe_session_id', paymentIntent.id);

        if (paymentError) {
          console.error('🔴 Error updating failed payment:', paymentError);
        } else {
          console.log('✅ Payment status updated to failed');
        }
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
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
