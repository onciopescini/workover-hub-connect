import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  export_type: 'payments' | 'bookings' | 'dac7' | 'users';
  filters?: Record<string, any>;
  page?: number;
  page_size?: number;
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
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const adminUser = data.user;

    if (!adminUser) {
      throw new Error('Unauthorized: User not authenticated');
    }

    // Verify admin role
    const { data: adminProfile, error: adminError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (adminError || adminProfile?.role !== 'admin') {
      console.error('[export-admin-csv] Unauthorized:', adminUser.id);
      throw new Error('Unauthorized: Admin access required');
    }

    const body: ExportRequest = await req.json();
    const { export_type, filters = {}, page = 1, page_size = 5000 } = body;

    console.log('[export-admin-csv] Admin:', adminUser.id, 'Type:', export_type, 'Page:', page);

    // Rate limiting check
    const { data: rateLimitData } = await supabaseClient.rpc('check_rate_limit_advanced', {
      p_identifier: adminUser.id,
      p_action: 'csv_export',
      p_max_requests: 10,
      p_window_ms: 3600000 // 10 exports/hour
    });

    if (rateLimitData && !rateLimitData.allowed) {
      throw new Error('Rate limit exceeded. Please wait before exporting again.');
    }

    let csvData: any[] = [];
    let totalRows = 0;

    // Fetch data based on export type
    if (export_type === 'payments') {
      const query = supabaseClient
        .from('payments')
        .select(`
          id,
          created_at,
          amount,
          host_amount,
          platform_fee,
          payment_status,
          method,
          stripe_session_id,
          booking:bookings(
            id,
            user:profiles!bookings_user_id_fkey(first_name, last_name),
            space:spaces(title)
          )
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * page_size, page * page_size - 1);

      if (filters.status) query.eq('payment_status', filters.status);
      if (filters.start_date) query.gte('created_at', filters.start_date);
      if (filters.end_date) query.lte('created_at', filters.end_date);

      const { data, error } = await query;
      if (error) throw error;
      csvData = data || [];
      totalRows = csvData.length;

    } else if (export_type === 'dac7') {
      const year = filters.year || new Date().getFullYear();
      const { data, error } = await supabaseClient
        .from('dac7_reports')
        .select('*')
        .eq('reporting_year', year)
        .order('total_income', { ascending: false })
        .range((page - 1) * page_size, page * page_size - 1);

      if (error) throw error;
      csvData = data || [];
      totalRows = csvData.length;
    }

    // Generate CSV
    const csvContent = generateCSV(csvData, export_type);
    const csvBlob = new TextEncoder().encode(csvContent);

    // Log export audit
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabaseClient.from('admin_csv_exports').insert({
      admin_id: adminUser.id,
      export_type,
      filters,
      row_count: totalRows,
      file_size_bytes: csvBlob.length,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    console.log('[export-admin-csv] Export completed:', totalRows, 'rows');

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${export_type}_export_page${page}.csv"`
      }
    });

  } catch (error: any) {
    console.error('[export-admin-csv] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function generateCSV(data: any[], exportType: string): string {
  if (data.length === 0) return '';

  let headers: string[] = [];
  let rows: string[][] = [];

  if (exportType === 'payments') {
    headers = ['ID', 'Data', 'Importo', 'Host Amount', 'Platform Fee', 'Stato', 'Metodo', 'Utente', 'Spazio', 'Stripe Session'];
    rows = data.map(p => [
      p.id,
      new Date(p.created_at).toLocaleString('it-IT'),
      p.amount?.toFixed(2) || '0.00',
      p.host_amount?.toFixed(2) || '0.00',
      p.platform_fee?.toFixed(2) || '0.00',
      p.payment_status,
      p.method || 'N/A',
      p.booking?.user ? `${p.booking.user.first_name} ${p.booking.user.last_name}` : 'N/A',
      p.booking?.space?.title || 'N/A',
      p.stripe_session_id || ''
    ]);
  } else if (exportType === 'dac7') {
    headers = ['Host ID', 'Anno', 'Reddito Totale', 'Transazioni', 'Soglia Superata', 'Stato'];
    rows = data.map(d => [
      d.host_id,
      d.reporting_year.toString(),
      d.total_income?.toFixed(2) || '0.00',
      d.total_transactions?.toString() || '0',
      d.reporting_threshold_met ? 'Sì' : 'No',
      d.report_status
    ]);
  }

  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ];

  return csvLines.join('\n');
}