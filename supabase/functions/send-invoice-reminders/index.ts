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
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('id, host_invoice_required, bookings(spaces(profiles(id)))')
      .eq('host_invoice_required', true)
      .eq('host_invoice_reminder_sent', false)
      .lt('host_invoice_deadline', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    let sent = 0;
    for (const payment of payments || []) {
      const hostId = payment.bookings?.spaces?.[0]?.profiles?.[0]?.id;
      if (!hostId) continue;

      await supabaseAdmin.from('user_notifications').insert({
        user_id: hostId,
        type: 'invoice',
        title: 'Reminder: Fattura da Emettere',
        content: 'Ricorda di emettere la fattura entro la scadenza.'
      });

      await supabaseAdmin.from('payments').update({ host_invoice_reminder_sent: true }).eq('id', payment.id);
      sent++;
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});
