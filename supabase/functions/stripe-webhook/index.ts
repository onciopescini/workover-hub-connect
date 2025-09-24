import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Webhook received');

    // Environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeKey || !webhookSecret) {
      throw new Error('Missing Stripe configuration');
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Get the request body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      throw new Error('Missing Stripe signature');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep('Webhook signature verification failed', { error: err.message });
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    logStep('Processing webhook event', { type: event.type, id: event.id });

    // Handle the webhook event
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        logStep('Processing account.updated', { accountId: account.id });

        // Check if account is verified and can accept payments
        const isVerified = account.charges_enabled && account.payouts_enabled;
        
        // Determine onboarding status
        let onboardingStatus: 'none' | 'pending' | 'completed' | 'restricted' = 'none';
        
        if (account.details_submitted) {
          if (isVerified) {
            onboardingStatus = 'completed';
          } else {
            onboardingStatus = 'pending';
          }
        } else {
          onboardingStatus = 'none';
        }
        
        // Check for restrictions
        if (account.requirements?.disabled_reason) {
          onboardingStatus = 'restricted';
        }

        // Find and update the profile
        const { data: profiles, error: findError } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('stripe_account_id', account.id);

        if (findError) {
          logStep('Error finding profile by stripe_account_id', findError);
          break;
        }

        if (!profiles || profiles.length === 0) {
          logStep('No profile found for Stripe account', { accountId: account.id });
          break;
        }

        const profile = profiles[0];
        logStep('Updating profile', { 
          userId: profile.id, 
          isVerified, 
          onboardingStatus 
        });

        // Update profile with new status
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            stripe_connected: isVerified,
            stripe_onboarding_status: onboardingStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          logStep('Error updating profile', updateError);
        } else {
          logStep('Profile updated successfully', {
            userId: profile.id,
            stripeConnected: isVerified,
            onboardingStatus
          });

          // Send notification email if verified
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
                      dashboardUrl: `${Deno.env.get('SITE_URL') || 'https://workover.app'}/host/dashboard`
                    }
                  }
                });
                logStep('Stripe setup completion email sent');
              }
            } catch (emailError) {
              logStep('Failed to send email', emailError);
            }
          }
        }
        break;
      }

      default:
        logStep('Unhandled event type', { type: event.type });
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});