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
    const { reporting_year } = await req.json();
    const year = reporting_year || new Date().getFullYear() - 1;
    
    console.log('[GENERATE-DAC7-REPORT] Year:', year);

    const { data: hostsData, error } = await supabaseAdmin
      .rpc('get_hosts_for_dac7_report', { report_year: year });

    if (error) throw error;

    let created = 0;
    for (const host of hostsData || []) {
      const thresholdMet = host.total_income >= 2000 && host.total_transactions >= 25;

      await supabaseAdmin.from('dac7_reports').upsert({
        host_id: host.host_id,
        reporting_year: year,
        total_income: host.total_income,
        total_transactions: host.total_transactions,
        reporting_threshold_met: thresholdMet,
        report_json_data: host,
        report_status: 'draft'
      }, { onConflict: 'host_id,reporting_year' });

      created++;
    }

    return new Response(JSON.stringify({ success: true, total: created }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});
