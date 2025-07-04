
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced logging function using ErrorHandler
const logStep = (step: string, details?: any) => {
  ErrorHandler.logInfo(`CHECK-STRIPE-STATUS: ${step}`, details);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("🔵 Function started");

    // Check all required environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    logStep("🔵 Environment check", {
      hasStripeKey: !!stripeKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRole: !!serviceRoleKey,
      stripeKeyPrefix: stripeKey ? stripeKey.substring(0, 7) + '...' : 'missing'
    });

    if (!stripeKey) {
      logStep("🔴 Missing STRIPE_SECRET_KEY");
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    if (!supabaseUrl) {
      logStep("🔴 Missing SUPABASE_URL");
      throw new Error('SUPABASE_URL is not configured');
    }
    if (!serviceRoleKey) {
      logStep("🔴 Missing SUPABASE_SERVICE_ROLE_KEY");
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    logStep("🔵 Supabase client initialized");

    // Check authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep("🔴 No authorization header");
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    logStep("🔵 Token extracted", { tokenLength: token.length });

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) {
      logStep("🔴 Authentication error", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user) {
      logStep("🔴 User not found");
      throw new Error('User not authenticated');
    }
    
    logStep("🔵 User authenticated", { userId: user.id, email: user.email });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, stripe_connected')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep("🔴 Profile error", { error: profileError.message });
      throw new Error(`Profile error: ${profileError.message}`);
    }
    
    if (!profile) {
      logStep("🔴 Profile not found");
      throw new Error('Profile not found');
    }

    logStep("🔵 Profile loaded", {
      userId: user.id,
      stripeAccountId: profile.stripe_account_id,
      stripeConnected: profile.stripe_connected
    });

    if (!profile.stripe_account_id) {
      logStep("🔵 No Stripe account ID found");
      return new Response(JSON.stringify({ 
        connected: false, 
        message: 'No Stripe account found',
        account_id: null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Initialize Stripe with enhanced error handling
    let stripe: Stripe;
    try {
      stripe = new Stripe(stripeKey, { 
        apiVersion: '2025-05-28.basil',
        timeout: 10000 // 10 second timeout
      });
      logStep("🔵 Stripe client initialized", { 
        apiVersion: '2025-05-28.basil',
        accountToCheck: profile.stripe_account_id 
      });
    } catch (stripeInitError: any) {
      logStep("🔴 Stripe initialization failed", { error: stripeInitError.message });
      throw new Error(`Stripe initialization failed: ${stripeInitError.message}`);
    }

    // Get account details from Stripe API with enhanced error handling
    let account: Stripe.Account;
    try {
      logStep("🔵 Calling Stripe API to retrieve account", { accountId: profile.stripe_account_id });
      account = await stripe.accounts.retrieve(profile.stripe_account_id);
      logStep("🔵 Stripe API call successful", {
        accountId: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        country: account.country,
        business_type: account.business_type
      });
    } catch (stripeApiError: any) {
      logStep("🔴 Stripe API call failed", { 
        error: stripeApiError.message,
        type: stripeApiError.type,
        code: stripeApiError.code,
        statusCode: stripeApiError.statusCode
      });
      throw new Error(`Stripe API error: ${stripeApiError.message}`);
    }
    
    const isConnected = account.charges_enabled && account.payouts_enabled;
    logStep("🔵 Account status calculated", {
      accountId: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      isConnected,
      currentDbStatus: profile.stripe_connected
    });

    // Update database if status has changed
    if (profile.stripe_connected !== isConnected) {
      logStep("🔵 Status change detected, updating database", { 
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
        logStep("🔴 Database update failed", { error: updateError.message });
        throw updateError;
      } else {
        logStep("✅ Database updated successfully");
      }
    } else {
      logStep("🔵 Status unchanged, no update needed");
    }

    const response = {
      connected: isConnected,
      account_id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      updated: profile.stripe_connected !== isConnected,
      country: account.country,
      business_type: account.business_type
    };

    logStep("✅ Function completed successfully", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logStep("🔴 FUNCTION ERROR", { 
      message: errorMessage,
      stack: errorStack,
      type: typeof error,
      errorObject: error
    });
    
    return new Response(JSON.stringify({ 
      connected: false,
      error: errorMessage,
      debug_info: {
        timestamp: new Date().toISOString(),
        error_type: typeof error,
        has_stack: !!errorStack
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
