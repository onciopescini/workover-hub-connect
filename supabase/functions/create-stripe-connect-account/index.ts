import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    console.log('[STRIPE-CONNECT] Starting Stripe Connect onboarding');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated or email not available');

    console.log('[STRIPE-CONNECT] User authenticated:', user.id);

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Check if user is host
    if (profile.role !== 'host') {
      throw new Error('Only hosts can connect a Stripe account');
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-08-27.basil',
    });

    console.log('[STRIPE-CONNECT] Checking for existing Stripe account');

    // Check if user already has a Stripe Connect account
    const { data: existingAccount } = await supabaseClient
      .from('stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let stripeAccountId: string;

    if (existingAccount?.stripe_account_id) {
      console.log('[STRIPE-CONNECT] Using existing Stripe account:', existingAccount.stripe_account_id);
      stripeAccountId = existingAccount.stripe_account_id;
    } else {
      console.log('[STRIPE-CONNECT] Creating new Stripe Connect account');

      // Create Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'IT',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          user_id: user.id,
          user_email: user.email,
        },
      });

      stripeAccountId = account.id;
      console.log('[STRIPE-CONNECT] Stripe account created:', stripeAccountId);

      // Save Stripe account to database
      await supabaseClient.from('stripe_accounts').upsert({
        user_id: user.id,
        stripe_account_id: stripeAccountId,
        account_status: 'pending',
        onboarding_completed: false,
        charges_enabled: false,
        payouts_enabled: false,
        account_type: 'express',
        country_code: 'IT',
        currency: 'eur',
      });

      console.log('[STRIPE-CONNECT] Stripe account saved to database');
    }

    // Create Stripe Connect onboarding link
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/host/stripe-connect?refresh=true`,
      return_url: `${origin}/host/stripe-connect?success=true`,
      type: 'account_onboarding',
    });

    console.log('[STRIPE-CONNECT] Onboarding link created');

    return new Response(JSON.stringify({
      success: true,
      url: accountLink.url,
      stripe_account_id: stripeAccountId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[STRIPE-CONNECT] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
