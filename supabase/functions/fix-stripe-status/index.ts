
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔵 FIX-STRIPE-STATUS: Starting manual fix...');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fix the specific account acct_1RUcf32QXwRUltvJ
    console.log('🔵 FIX-STRIPE-STATUS: Updating account acct_1RUcf32QXwRUltvJ to connected=true');
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        stripe_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', 'acct_1RUcf32QXwRUltvJ')
      .select();

    if (error) {
      console.error('🔴 FIX-STRIPE-STATUS: Error fixing Stripe status:', error);
      throw error;
    }

    console.log('✅ FIX-STRIPE-STATUS: Fixed Stripe status for account acct_1RUcf32QXwRUltvJ:', data);

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
    console.error('🔴 FIX-STRIPE-STATUS: Error in fix-stripe-status:', error);
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
