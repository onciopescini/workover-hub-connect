import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DAC7ReportJSON {
  reportMetadata: {
    reportingYear: number;
    generatedAt: string;
    generatedBy: string;
    platformOperator: {
      name: string;
      taxId: string;
      address: {
        line1: string;
        city: string;
        postalCode: string;
        country: string;
      };
    };
  };
  reportableSeller: {
    profileId: string;
    entityType: 'individual' | 'business';
    personalInfo: {
      firstName: string;
      lastName: string;
    };
    taxIdentification: {
      primaryTaxId: string;
      vatNumber?: string;
      issuingCountry: string;
    };
    address: {
      line1: string;
      line2?: string;
      city: string;
      province?: string;
      postalCode: string;
      country: string;
    };
    financialAccount: {
      iban: string;
      bicSwift?: string;
      accountHolderName: string;
    };
  };
  activityMetrics: {
    totalGrossIncome: number;
    numberOfTransactions: number;
    totalHoursProvided: number;
    totalDaysProvided: number;
    monthlyBreakdown: Array<{
      month: string;
      income: number;
      transactions: number;
      hours: number;
      days: number;
    }>;
  };
  thresholdAssessment: {
    incomeThresholdMet: boolean;
    transactionThresholdMet: boolean;
    reportingRequired: boolean;
    thresholds: {
      income: number;
      transactions: number;
    };
  };
}

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
    tax_id: string;
    vat_number?: string;
    entity_type: 'individual' | 'business';
    address_line1: string;
    address_line2?: string;
    city: string;
    province?: string;
    postal_code: string;
    country_code: string;
    iban: string;
    bic_swift?: string;
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[DAC7] Starting report generation...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { year, hostIds, dryRun = false } = await req.json();
    const targetYear = year || new Date().getFullYear() - 1;

    console.log(`[DAC7] Target year: ${targetYear}, dryRun: ${dryRun}`);

    // Query host eligibili
    const { data: eligibleHosts, error: queryError } = await supabaseAdmin.rpc(
      'get_hosts_for_dac7_report',
      { 
        report_year: targetYear,
        host_ids_filter: hostIds || null 
      }
    ) as { data: HostDAC7Data[] | null; error: any };

    if (queryError) {
      console.error('[DAC7] Query error:', queryError);
      throw queryError;
    }

    console.log(`[DAC7] Found ${eligibleHosts?.length || 0} eligible hosts`);

    const results = {
      processed: 0,
      thresholdMet: 0,
      belowThreshold: 0,
      errors: [] as Array<{ hostId: string; error: string }>,
      reports: [] as Array<{ hostId: string; reportId: string; thresholdMet: boolean }>,
    };

    if (!eligibleHosts || eligibleHosts.length === 0) {
      console.log('[DAC7] No eligible hosts found');
      return new Response(
        JSON.stringify({
          success: true,
          year: targetYear,
          summary: results,
          dryRun,
          message: 'No eligible hosts found for this year'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processa ogni host
    for (const host of eligibleHosts) {
      try {
        console.log(`[DAC7] Processing host ${host.host_id}...`);

        // Verifica dati fiscali
        if (!host.tax_details) {
          results.errors.push({
            hostId: host.host_id,
            error: 'Missing tax_details - Host must complete fiscal information',
          });
          console.warn(`[DAC7] Host ${host.host_id} missing tax_details`);
          continue;
        }

        // Valida IBAN
        if (!isValidIBAN(host.tax_details.iban)) {
          results.errors.push({
            hostId: host.host_id,
            error: 'Invalid IBAN format',
          });
          console.warn(`[DAC7] Host ${host.host_id} invalid IBAN`);
          continue;
        }

        // Verifica soglie DAC7
        const incomeThresholdMet = host.total_income >= 2000;
        const transactionThresholdMet = host.total_transactions >= 25;
        const reportingRequired = incomeThresholdMet && transactionThresholdMet;

        console.log(`[DAC7] Host ${host.host_id} - Income: €${host.total_income}, Tx: ${host.total_transactions}, Required: ${reportingRequired}`);

        // Genera JSON strutturato
        const reportJSON: DAC7ReportJSON = {
          reportMetadata: {
            reportingYear: targetYear,
            generatedAt: new Date().toISOString(),
            generatedBy: 'system',
            platformOperator: {
              name: 'Workover S.r.l.',
              taxId: 'IT12345678901',
              address: {
                line1: 'Via Example 123',
                city: 'Milano',
                postalCode: '20100',
                country: 'IT',
              },
            },
          },
          reportableSeller: {
            profileId: host.host_id,
            entityType: host.tax_details.entity_type || 'individual',
            personalInfo: {
              firstName: host.first_name,
              lastName: host.last_name,
            },
            taxIdentification: {
              primaryTaxId: host.tax_details.tax_id,
              vatNumber: host.tax_details.vat_number,
              issuingCountry: host.tax_details.country_code,
            },
            address: {
              line1: host.tax_details.address_line1,
              line2: host.tax_details.address_line2,
              city: host.tax_details.city,
              province: host.tax_details.province,
              postalCode: host.tax_details.postal_code,
              country: host.tax_details.country_code,
            },
            financialAccount: {
              iban: host.tax_details.iban,
              bicSwift: host.tax_details.bic_swift,
              accountHolderName: `${host.first_name} ${host.last_name}`,
            },
          },
          activityMetrics: {
            totalGrossIncome: host.total_income,
            numberOfTransactions: host.total_transactions,
            totalHoursProvided: host.total_hours,
            totalDaysProvided: host.total_days,
            monthlyBreakdown: host.monthly_data,
          },
          thresholdAssessment: {
            incomeThresholdMet,
            transactionThresholdMet,
            reportingRequired,
            thresholds: { income: 2000, transactions: 25 },
          },
        };

        if (!dryRun) {
          // Salva JSON in Storage
          const fileName = `${host.host_id}/dac7_report_${targetYear}.json`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from('dac7-reports')
            .upload(fileName, JSON.stringify(reportJSON, null, 2), {
              contentType: 'application/json',
              upsert: true,
            });

          if (uploadError) {
            console.error(`[DAC7] Upload error for ${host.host_id}:`, uploadError);
            throw uploadError;
          }

          // Genera signed URL (1 anno)
          const { data: signedUrl } = await supabaseAdmin.storage
            .from('dac7-reports')
            .createSignedUrl(fileName, 365 * 24 * 60 * 60);

          // Inserisci/Aggiorna dac7_reports
          const { data: reportRecord, error: insertError } = await supabaseAdmin
            .from('dac7_reports')
            .upsert({
              host_id: host.host_id,
              reporting_year: targetYear,
              total_income: host.total_income,
              total_transactions: host.total_transactions,
              reporting_threshold_met: reportingRequired,
              report_generated_at: new Date().toISOString(),
              report_file_url: signedUrl?.signedUrl,
              report_json_data: reportJSON,
              report_status: reportingRequired ? 'final' : 'draft',
              generated_by: null,
            })
            .select()
            .single();

          if (insertError) {
            console.error(`[DAC7] Insert error for ${host.host_id}:`, insertError);
            throw insertError;
          }

          console.log(`[DAC7] Report saved for host ${host.host_id}, ID: ${reportRecord.id}`);

          // Notifica host SE sopra soglia
          if (reportingRequired) {
            await sendHostNotification(supabaseAdmin, host, reportRecord.id, targetYear);
            results.thresholdMet++;
          } else {
            results.belowThreshold++;
          }

          results.reports.push({
            hostId: host.host_id,
            reportId: reportRecord.id,
            thresholdMet: reportingRequired,
          });
        }

        results.processed++;
      } catch (error) {
        console.error(`[DAC7] Error processing host ${host.host_id}:`, error);
        results.errors.push({
          hostId: host.host_id,
          error: error.message,
        });
      }
    }

    // Invia digest admin
    if (!dryRun && results.processed > 0) {
      await sendAdminDigest(supabaseAdmin, targetYear, results);
    }

    console.log(`[DAC7] Completed - Processed: ${results.processed}, Threshold met: ${results.thresholdMet}, Errors: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        year: targetYear,
        summary: results,
        dryRun,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DAC7] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Validazione IBAN
function isValidIBAN(iban: string): boolean {
  const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]+$/;
  return ibanRegex.test(iban.replace(/\s/g, ''));
}

// Helper: Notifica in-app host
async function sendHostNotification(
  supabase: any,
  host: HostDAC7Data,
  reportId: string,
  year: number
) {
  try {
    await supabase.from('user_notifications').insert({
      user_id: host.host_id,
      type: 'dac7',
      title: '📊 Report DAC7 disponibile',
      content: `Il tuo report fiscale DAC7 per l'anno ${year} è pronto. Hai superato le soglie di reporting (€2.000 e 25 transazioni). Consulta l'Area Fiscale per i dettagli.`,
      metadata: {
        report_id: reportId,
        reporting_year: year,
        action_required: true,
        deadline: `${year + 1}-01-31`,
      },
    });
    console.log(`[DAC7] Notification sent to host ${host.host_id}`);
  } catch (error) {
    console.error(`[DAC7] Error sending notification to ${host.host_id}:`, error);
  }
}

// Helper: Digest admin
async function sendAdminDigest(supabase: any, year: number, results: any) {
  try {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, email, first_name')
      .eq('role', 'admin');

    for (const admin of admins || []) {
      await supabase.from('user_notifications').insert({
        user_id: admin.id,
        type: 'admin',
        title: `📊 Digest DAC7 ${year} - Generazione completata`,
        content: `Report DAC7 generati: ${results.processed} host processati, ${results.thresholdMet} sopra soglia, ${results.errors.length} errori. Consulta il pannello admin per i dettagli.`,
        metadata: {
          year,
          summary: results,
        },
      });
    }
    console.log(`[DAC7] Admin digest sent for year ${year}`);
  } catch (error) {
    console.error('[DAC7] Error sending admin digest:', error);
  }
}
