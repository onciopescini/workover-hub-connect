import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONNECT-ONBOARDING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    // Environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://workover.app';
    
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    logStep('Environment validated');

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep('Authentication failed', userError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const user = userData.user;
    logStep('User authenticated', { userId: user.id });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_account_id, stripe_connected, stripe_onboarding_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logStep('Profile not found', profileError);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logStep('Profile access verified', {
      userId: user.id, 
      stripeAccountId: profile.stripe_account_id,
      stripeConnected: profile.stripe_connected
    });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    let stripeAccountId = profile.stripe_account_id;

    // Create Stripe Express account if not exists
    if (!stripeAccountId) {
      logStep('Creating new Stripe Express account');
      
      const account = await stripe.accounts.create({
        type: 'express',
        business_type: 'individual',
        country: 'IT',
        email: user.email,
      });

      stripeAccountId = account.id;
      logStep('Stripe account created', { accountId: stripeAccountId });

      // Update profile with new Stripe account ID
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          stripe_account_id: stripeAccountId,
          stripe_connected: false,
          stripe_onboarding_status: 'pending',
          role: 'host',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        logStep('Failed to update profile with Stripe account ID', updateError);
        throw new Error('Failed to save Stripe account information');
      }

      logStep('Profile updated with Stripe account ID');
    }

    // Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: 'account_onboarding',
      refresh_url: `${siteUrl}/host/dashboard?state=refresh`,
      return_url: `${siteUrl}/host/dashboard?state=success`,
    });

    logStep('Account link created', { url: accountLink.url });

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      stripe_account_id: stripeAccountId
    }), {
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
