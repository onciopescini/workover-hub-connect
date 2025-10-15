// ONDATA 2: FIX 2.5 - DAC7 Annual Report Generation
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { year } = await req.json();
    const reportYear = year || new Date().getFullYear() - 1;

    console.log(`[DAC7-REPORT] Generating reports for year ${reportYear}`);

    const { data: hosts, error } = await supabaseAdmin.rpc('get_hosts_for_dac7_report', {
      report_year: reportYear
    });

    if (error) throw error;

    console.log(`[DAC7-REPORT] Found ${hosts?.length || 0} hosts to report`);

    for (const host of hosts || []) {
      await supabaseAdmin.from('dac7_reports').upsert({
        host_id: host.host_id,
        reporting_year: reportYear,
        total_income: host.total_income,
        total_transactions: host.total_transactions,
        reporting_threshold_met: host.total_income >= 2000 && host.total_transactions >= 25,
        report_json_data: host,
        report_status: 'draft',
        report_generated_at: new Date().toISOString()
      });
    }

    return new Response(JSON.stringify({ success: true, count: hosts?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('[DAC7-REPORT] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
