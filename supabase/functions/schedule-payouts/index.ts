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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    console.log('[SCHEDULE-PAYOUTS] Starting');

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('id, service_completed_at, spaces(profiles(stripe_connected, kyc_documents_verified))')
      .eq('status', 'served')
      .is('payout_scheduled_at', null)
      .lt('service_completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    let scheduled = 0;
    for (const booking of bookings || []) {
      const host = booking.spaces.profiles;
      if (!host.stripe_connected || !host.kyc_documents_verified) continue;

      await supabaseAdmin.from('bookings').update({ 
        payout_scheduled_at: new Date().toISOString() 
      }).eq('id', booking.id);
      
      scheduled++;
    }

    return new Response(JSON.stringify({ success: true, scheduled }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});
