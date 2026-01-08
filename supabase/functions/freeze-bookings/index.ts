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
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('id, spaces(profiles(stripe_connected))')
      .eq('status', 'confirmed')
      .lt('booking_date', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) throw error;

    let frozen = 0;
    for (const booking of bookings || []) {
      // FIX: Access array elements [0] for both spaces and profiles relations
      const isStripeConnected = booking.spaces?.[0]?.profiles?.[0]?.stripe_connected;

      if (isStripeConnected) continue;

      await supabaseAdmin.from('bookings').update({ status: 'frozen' }).eq('id', booking.id);
      frozen++;
    }

    return new Response(JSON.stringify({ success: true, frozen }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});
