
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

    // Verifica ruolo nella tabella user_roles
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'host')
      .single();

    if (roleError || !userRole) {
      ErrorHandler.logError('User is not a host', roleError, {
        operation: 'role_validation',
        userId: user.id
      });
      throw new Error('Only hosts can connect Stripe accounts');
    }

    ErrorHandler.logInfo('Role validated via user_roles', { role: 'host' });

    // Ottieni dati del profilo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      ErrorHandler.logError('Host profile not found', profileError, {
        operation: 'fetch_profile',
        userId: user.id 
      });
      throw new Error('Host profile not found');
    }

    ErrorHandler.logInfo('Profile loaded', { profileId: profile.id });

    // Prendi i parametri dal corpo della richiesta come fallback
    const { return_url: fallbackReturnUrl, refresh_url: fallbackRefreshUrl } = await req.json().catch(() => ({}));
    const origin = req.headers.get('origin') || 'https://preview-workover-hub-connect.lovable.app';
    
    // Utilizza l'URL di ritorno memorizzato nel profilo se disponibile
    const storedReturnUrl = profile.return_url;
    ErrorHandler.logInfo('Return URL info', { 
      hasStoredReturnUrl: !!storedReturnUrl, 
      hasFallbackReturnUrl: !!fallbackReturnUrl 
    });

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

    // Crea Account Link per onboarding
    ErrorHandler.logInfo('Creating account link');
    
    // Implementa validazione URL
    let finalReturnUrl = fallbackReturnUrl;
    let finalRefreshUrl = fallbackRefreshUrl;
    
    // Utilizza l'URL di ritorno memorizzato nel profilo se disponibile
    if (storedReturnUrl) {
      try {
        // Semplice validazione che sia un URL valido e che inizi con https://
        const url = new URL(storedReturnUrl);
        if (url.protocol === 'https:') {
          finalReturnUrl = storedReturnUrl;
          ErrorHandler.logInfo('Using stored return URL', { url: finalReturnUrl });
        }
      } catch (e) {
        ErrorHandler.logError('Invalid stored return URL', e, { url: storedReturnUrl });
      }
    }
    
    // Crea l'account link utilizzando l'URL corretto
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: finalReturnUrl || `${origin}/host/dashboard?stripe_setup=success`,
      refresh_url: finalRefreshUrl || `${origin}/host/dashboard?stripe_setup=refresh`,
      type: 'account_onboarding',
    });
    
    // Dopo aver utilizzato il return_url dal profilo, lo cancelliamo
    if (storedReturnUrl) {
      const { error: clearUrlError } = await supabaseAdmin
        .from('profiles')
        .update({ return_url: null })
        .eq('id', user.id);
        
      if (clearUrlError) {
        ErrorHandler.logError('Error clearing return URL from profile', clearUrlError, {
          operation: 'clear_return_url',
          userId: user.id
        });
      } else {
        ErrorHandler.logInfo('Return URL cleared from profile', { userId: user.id });
      }
    }

    ErrorHandler.logSuccess('Account link created successfully', { 
      accountId,
      usedStoredUrl: !!storedReturnUrl,
      usedFallbackUrl: !storedReturnUrl && !!fallbackReturnUrl
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
