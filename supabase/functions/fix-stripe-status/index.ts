
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ErrorHandler } from "../_shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    ErrorHandler.logInfo('FIX-STRIPE-STATUS: Starting manual fix');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fix the specific account acct_1RUcf32QXwRUltvJ
    ErrorHandler.logInfo('FIX-STRIPE-STATUS: Updating account', {
      account_id: 'acct_1RUcf32QXwRUltvJ',
      action: 'set_connected_true'
    });
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        stripe_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', 'acct_1RUcf32QXwRUltvJ')
      .select();

    if (error) {
      ErrorHandler.logError('FIX-STRIPE-STATUS: Error fixing Stripe status', error, {
        account_id: 'acct_1RUcf32QXwRUltvJ'
      });
      throw error;
    }

    ErrorHandler.logSuccess('FIX-STRIPE-STATUS: Fixed Stripe status', {
      account_id: 'acct_1RUcf32QXwRUltvJ',
      updated_profiles: data?.length || 0
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Stripe status fixed successfully',
      updated_profiles: data?.length || 0,
      account_fixed: 'acct_1RUcf32QXwRUltvJ'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError('FIX-STRIPE-STATUS: Error in fix-stripe-status', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
