
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

interface ConnectRequest {
  return_url?: string;
  refresh_url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verifica autenticazione
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log('Creating Stripe Connect account for user:', user.id);

    // Ottieni dati del profilo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Verifica che sia un host
    if (profile.role !== 'host') {
      throw new Error('Only hosts can connect Stripe accounts');
    }

    const { return_url, refresh_url }: ConnectRequest = await req.json();

    let accountId = profile.stripe_account_id;

    // Crea account Stripe Connect se non esiste
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'IT',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Coworking space hosting',
        },
      });

      accountId = account.id;

      // Salva l'account ID nel profilo
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile with Stripe account ID:', updateError);
      }
      
      console.log('Created Stripe account:', accountId);
    }

    // Crea Account Link per onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: return_url || `${req.headers.get('origin')}/host/dashboard`,
      refresh_url: refresh_url || `${req.headers.get('origin')}/host/dashboard`,
      type: 'account_onboarding',
    });

    console.log('Account link created:', accountLink.url);

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      account_id: accountId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in stripe-connect:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
