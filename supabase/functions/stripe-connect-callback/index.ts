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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { account_id } = await req.json();

    if (!account_id) {
      throw new Error('Stripe account ID is required');
    }

    console.log('[stripe-connect-callback] Processing for user:', user.id, 'account:', account_id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Verify the account exists and get its details
    const account = await stripe.accounts.retrieve(account_id);

    console.log('[stripe-connect-callback] Account retrieved:', {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });

    // Check if account is fully onboarded
    if (!account.details_submitted) {
      console.warn('[stripe-connect-callback] Account onboarding not completed');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Stripe account onboarding not completed',
          onboarding_required: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Update user profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        stripe_account_id: account_id,
        stripe_connected: true,
        stripe_onboarding_completed: account.details_submitted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[stripe-connect-callback] Error updating profile:', updateError);
      throw updateError;
    }

    console.log('[stripe-connect-callback] Profile updated successfully');

    // Create notification
    await supabaseClient
      .from('user_notifications')
      .insert({
        user_id: user.id,
        type: 'system',
        title: 'Account Stripe Connesso',
        content: 'Il tuo account Stripe è stato collegato con successo. Ora puoi iniziare a ricevere pagamenti.',
        metadata: {
          account_id: account_id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        account_id: account_id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        message: 'Stripe account connected successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[stripe-connect-callback] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
