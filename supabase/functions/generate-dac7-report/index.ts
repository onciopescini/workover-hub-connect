import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HostDAC7Data {
  host_id: string;
  first_name: string;
  last_name: string;
  email: string;
  total_income: number;
  total_transactions: number;
  total_hours: number;
  total_days: number;
  monthly_data: Array<{
    month: string;
    income: number;
    transactions: number;
    hours: number;
    days: number;
  }>;
  tax_details: {
    tax_id?: string;
    vat_number?: string;
    entity_type?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country_code?: string;
    iban?: string;
    bic_swift?: string;
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { year } = await req.json();
    const reportingYear = year || new Date().getFullYear() - 1;

    console.log(`[DAC7] Generating report for year ${reportingYear}`);

    // 1. Get all hosts with completed payments in the year
    const { data: hostsData, error: hostsError } = await supabaseClient.rpc(
      'get_hosts_for_dac7_report',
      { 
        report_year: reportingYear,
        host_ids_filter: null
      }
    );

    if (hostsError) {
      console.error('[DAC7] Error fetching hosts:', hostsError);
      throw hostsError;
    }

    console.log(`[DAC7] Found ${hostsData?.length || 0} hosts with activity`);

    const results = {
      total_hosts: hostsData?.length || 0,
      above_threshold: 0,
      below_threshold: 0,
      reports_created: 0,
      errors: [] as Array<{ host_id: string; error: string }>
    };

    // 2. Process each host
    for (const host of (hostsData as HostDAC7Data[] || [])) {
      const thresholdMet = host.total_income >= 2000 && host.total_transactions >= 25;
      
      if (thresholdMet) {
        results.above_threshold++;
      } else {
        results.below_threshold++;
        continue;
      }

      // 3. Prepare DAC7 JSON data
      const dac7JsonData = {
        host_id: host.host_id,
        reporting_year: reportingYear,
        personal_data: {
          first_name: host.first_name,
          last_name: host.last_name,
          email: host.email,
          tax_details: host.tax_details || {}
        },
        financial_summary: {
          total_income: host.total_income,
          total_transactions: host.total_transactions,
          total_hours: host.total_hours,
          total_days: host.total_days
        },
        monthly_breakdown: host.monthly_data || [],
        generated_at: new Date().toISOString(),
        threshold_met: true
      };

      // 4. Check if required data is complete
      const missingData: string[] = [];
      if (!host.tax_details?.tax_id) missingData.push('tax_id');
      if (!host.tax_details?.iban) missingData.push('iban');
      if (!host.tax_details?.address_line1) missingData.push('address');
      if (!host.tax_details?.country_code) missingData.push('country_code');

      const reportStatus = missingData.length > 0 ? 'draft' : 'final';

      // 5. Insert/update DAC7 report
      const { error: reportError } = await supabaseClient
        .from('dac7_reports')
        .upsert({
          host_id: host.host_id,
          reporting_year: reportingYear,
          total_income: host.total_income,
          total_transactions: host.total_transactions,
          reporting_threshold_met: true,
          report_status: reportStatus,
          report_json_data: dac7JsonData,
          report_generated_at: new Date().toISOString(),
          error_details: missingData.length > 0 ? { missing_fields: missingData } : null,
          generated_by: null
        }, {
          onConflict: 'host_id,reporting_year'
        });

      if (reportError) {
        console.error(`[DAC7] Error creating report for host ${host.host_id}:`, reportError);
        results.errors.push({ host_id: host.host_id, error: reportError.message });
        continue;
      }

      results.reports_created++;

      // 6. Notify host
      const notificationContent = missingData.length > 0
        ? `Il tuo report DAC7 per l'anno ${reportingYear} è in bozza. Completa i dati fiscali mancanti: ${missingData.join(', ')}.`
        : `Il tuo report DAC7 per l'anno ${reportingYear} è stato generato. Hai superato le soglie (€${host.total_income.toFixed(2)}, ${host.total_transactions} transazioni).`;

      await supabaseClient.from('user_notifications').insert({
        user_id: host.host_id,
        type: 'dac7_report',
        title: '📊 Report DAC7 Disponibile',
        content: notificationContent,
        metadata: {
          reporting_year: reportingYear,
          total_income: host.total_income,
          total_transactions: host.total_transactions,
          report_status: reportStatus,
          missing_data: missingData
        }
      });
    }

    // 7. Notify admins
    const { data: admins } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    for (const admin of (admins || [])) {
      await supabaseClient.from('user_notifications').insert({
        user_id: admin.id,
        type: 'dac7_report',
        title: '📊 Report DAC7 Generati',
        content: `Report DAC7 ${reportingYear} completati: ${results.reports_created} host sopra soglia su ${results.total_hosts} totali.`,
        metadata: results
      });
    }

    console.log('[DAC7] Report generation completed:', results);

    return new Response(JSON.stringify({
      success: true,
      year: reportingYear,
      summary: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[DAC7] Fatal error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
