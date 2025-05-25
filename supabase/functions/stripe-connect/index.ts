
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔵 Stripe Connect function started');

    // Verifica delle variabili d'ambiente
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey) {
      console.error('🔴 STRIPE_SECRET_KEY not found');
      throw new Error('Stripe configuration missing');
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('🔴 Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }

    console.log('🔵 Environment variables verified');

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
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
      console.error('🔴 Missing authorization header');
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔵 Extracting user from token');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('🔴 Authentication failed:', authError);
      throw new Error('Invalid authentication');
    }

    console.log('🔵 User authenticated:', user.id);

    // Ottieni dati del profilo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('🔴 Profile not found:', profileError);
      throw new Error('Profile not found');
    }

    console.log('🔵 Profile loaded:', profile.id, 'Role:', profile.role);

    // Verifica che sia un host
    if (profile.role !== 'host') {
      console.error('🔴 User is not a host:', profile.role);
      throw new Error('Only hosts can connect Stripe accounts');
    }

    const { return_url, refresh_url } = await req.json().catch(() => ({}));
    const origin = req.headers.get('origin') || 'https://preview-workover-hub-connect.lovable.app';

    let accountId = profile.stripe_account_id;

    // Crea account Stripe Connect se non esiste
    if (!accountId) {
      console.log('🔵 Creating new Stripe Connect account');
      
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
      console.log('🔵 Stripe account created:', accountId);

      // Salva l'account ID nel profilo
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          stripe_account_id: accountId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('🔴 Error updating profile with Stripe account ID:', updateError);
        // Non bloccare il processo, continua comunque
      } else {
        console.log('🔵 Profile updated with Stripe account ID');
      }
    } else {
      console.log('🔵 Using existing Stripe account:', accountId);
    }

    // Crea Account Link per onboarding
    console.log('🔵 Creating account link');
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: return_url || `${origin}/host/dashboard?stripe_setup=success`,
      refresh_url: refresh_url || `${origin}/host/dashboard?stripe_setup=refresh`,
      type: 'account_onboarding',
    });

    console.log('🔵 Account link created successfully:', accountLink.url);

    return new Response(JSON.stringify({ 
      success: true,
      url: accountLink.url,
      account_id: accountId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('🔴 Error in stripe-connect function:', error);
    
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
