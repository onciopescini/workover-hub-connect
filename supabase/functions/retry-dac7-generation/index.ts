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
    console.log('[retry-dac7] Starting retry job');

    // Get pending retries
    const { data: pendingQueue, error: queueError } = await supabaseAdmin
      .from('dac7_generation_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .lt('retry_count', 3)
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (queueError) throw queueError;

    if (!pendingQueue || pendingQueue.length === 0) {
      console.log('[retry-dac7] No pending retries');
      return new Response(JSON.stringify({ message: 'No pending retries' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    for (const queueItem of pendingQueue) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from('dac7_generation_queue')
          .update({ 
            status: 'processing', 
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);

        console.log('[retry-dac7] Processing:', queueItem.id, 'Year:', queueItem.reporting_year);

        // Call DAC7 generation
        const { data: hostsData, error: rpcError } = await supabaseAdmin
          .rpc('get_hosts_for_dac7_report', { 
            report_year: queueItem.reporting_year,
            host_ids_filter: queueItem.host_id ? [queueItem.host_id] : null
          });

        if (rpcError) throw rpcError;

        let generated = 0;
        for (const host of hostsData || []) {
          const thresholdMet = host.total_income >= 2000 && host.total_transactions >= 25;

          await supabaseAdmin.from('dac7_reports').upsert({
            host_id: host.host_id,
            reporting_year: queueItem.reporting_year,
            total_income: host.total_income,
            total_transactions: host.total_transactions,
            reporting_threshold_met: thresholdMet,
            report_json_data: host,
            report_status: 'draft',
            generated_by: 'system_retry'
          }, { onConflict: 'host_id,reporting_year' });

          generated++;
        }

        // Mark as completed
        await supabaseAdmin
          .from('dac7_generation_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);

        results.push({ id: queueItem.id, status: 'success', reports_generated: generated });
        console.log('[retry-dac7] Success:', queueItem.id, 'Generated:', generated);

      } catch (itemError: any) {
        console.error('[retry-dac7] Error processing:', queueItem.id, itemError.message);

        // Schedule retry or mark as failed
        await supabaseAdmin.rpc('schedule_dac7_retry', { queue_id_param: queueItem.id });

        // Update error details
        await supabaseAdmin
          .from('dac7_generation_queue')
          .update({
            error_message: itemError.message,
            error_details: { error: itemError.message, stack: itemError.stack },
            updated_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);

        results.push({ id: queueItem.id, status: 'failed', error: itemError.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[retry-dac7] Fatal error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});