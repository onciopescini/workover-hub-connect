
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-STRIPE-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');
    logStep("Stripe key verified");

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    logStep("Authorization header found");

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');
    logStep("User authenticated", { userId: user.id });

    // Get user profile with stripe_account_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, stripe_connected')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (!profile.stripe_account_id) {
      logStep("No Stripe account ID found");
      return new Response(JSON.stringify({ 
        connected: false, 
        message: 'No Stripe account found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    logStep("Checking Stripe account status", { accountId: profile.stripe_account_id });

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Get account details from Stripe API
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    
    const isConnected = account.charges_enabled && account.payouts_enabled;
    logStep("Stripe account status retrieved", {
      accountId: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      isConnected,
      details_submitted: account.details_submitted
    });

    // Update database if status has changed
    if (profile.stripe_connected !== isConnected) {
      logStep("Updating database with new status", { 
        oldStatus: profile.stripe_connected, 
        newStatus: isConnected 
      });

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          stripe_connected: isConnected,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('🔴 Error updating profile:', updateError);
        throw updateError;
      } else {
        logStep("✅ Profile updated successfully");
      }
    } else {
      logStep("Status unchanged, no update needed");
    }

    return new Response(JSON.stringify({
      connected: isConnected,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      updated: profile.stripe_connected !== isConnected
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-stripe-status", { message: errorMessage });
    return new Response(JSON.stringify({ 
      connected: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
