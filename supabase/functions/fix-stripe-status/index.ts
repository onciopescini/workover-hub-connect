
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
    // This is a one-time fix for the current issue
    const supabaseAdmin = createClient(
      Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!
    );

    // Fix the specific account acct_1RUcf32QXwRUltvJ
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        stripe_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', 'acct_1RUcf32QXwRUltvJ')
      .select();

    if (error) {
      console.error('🔴 Error fixing Stripe status:', error);
      throw error;
    }

    console.log('✅ Fixed Stripe status for account acct_1RUcf32QXwRUltvJ:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Stripe status fixed',
      updated_profiles: data?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('🔴 Error in fix-stripe-status:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
