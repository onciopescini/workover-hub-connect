
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    ErrorHandler.logInfo('Stripe Connect function started');

    // Verifica delle variabili d'ambiente
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey) {
      ErrorHandler.logError('STRIPE_SECRET_KEY not found', null, { operation: 'env_validation' });
      throw new Error('Stripe configuration missing');
    }

    if (!supabaseUrl || !serviceRoleKey) {
      ErrorHandler.logError('Supabase configuration missing', null, { operation: 'env_validation' });
      throw new Error('Supabase configuration missing');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-05-28.basil',
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Verifica autenticazione
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      ErrorHandler.logError('Missing authorization header', null, { operation: 'auth_validation' });
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    ErrorHandler.logInfo('Extracting user from token');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      ErrorHandler.logError('Authentication failed', authError, { operation: 'user_auth' });
      throw new Error('Invalid authentication');
    }

    ErrorHandler.logInfo('User authenticated', { userId: user.id });

    // Ottieni dati del profilo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      ErrorHandler.logError('Profile not found', profileError, { 
        operation: 'fetch_profile',
        userId: user.id 
      });
      throw new Error('Profile not found');
    }

    ErrorHandler.logInfo('Profile loaded', { profileId: profile.id, role: profile.role });

    // Verifica che sia un host
    if (profile.role !== 'host') {
      ErrorHandler.logError('User is not a host', null, { 
        operation: 'role_validation',
        userId: user.id,
        role: profile.role 
      });
      throw new Error('Only hosts can connect Stripe accounts');
    }

    const { return_url, refresh_url } = await req.json().catch(() => ({}));
    const origin = req.headers.get('origin') || 'https://preview-workover-hub-connect.lovable.app';

    let accountId = profile.stripe_account_id;

    // Crea account Stripe Connect se non esiste
    if (!accountId) {
      ErrorHandler.logInfo('Creating new Stripe Connect account');
      
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'IT',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Servizi di coworking',
        },
      });

      accountId = account.id;
      ErrorHandler.logSuccess('Stripe account created', { accountId });

      // Salva l'account ID nel profilo
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          stripe_account_id: accountId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        ErrorHandler.logError('Error updating profile with Stripe account ID', updateError, {
          operation: 'update_profile',
          userId: user.id,
          accountId
        });
        // Non bloccare il processo, continua comunque
      } else {
        ErrorHandler.logSuccess('Profile updated with Stripe account ID');
      }
    } else {
      ErrorHandler.logInfo('Using existing Stripe account', { accountId });
    }

    // Crea Account Link per onboarding - FIXED URL
    ErrorHandler.logInfo('Creating account link');
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: return_url || `${origin}/host/dashboard?stripe_setup=success`,
      refresh_url: refresh_url || `${origin}/host/dashboard?stripe_setup=refresh`,
      type: 'account_onboarding',
    });

    ErrorHandler.logSuccess('Account link created successfully', { 
      accountId,
      hasReturnUrl: !!return_url,
      hasRefreshUrl: !!refresh_url
    });

    return new Response(JSON.stringify({ 
      success: true,
      url: accountLink.url,
      account_id: accountId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError('Error in stripe-connect function', error, {
      operation: 'stripe_connect',
      error_message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
