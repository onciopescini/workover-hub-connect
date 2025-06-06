import { supabase } from "@/integrations/supabase/client";

export interface RevenueData {
  totalRevenue: number;
  totalBookings: number;
  recentPayouts: Array<{
    id: string;
    amount: number;
    date: string;
    booking_id: string;
    space_title: string;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
}

export interface DAC7Data {
  totalIncome: number;
  totalTransactions: number;
  thresholdMet: boolean;
  reportingYear: number;
}

interface Dac7ThresholdResult {
  total_income: number;
  total_transactions: number;
  threshold_met: boolean;
}

export const getHostRevenueData = async (
  hostId: string,
  year: string,
  month: string = "all"
): Promise<RevenueData> => {
  // Build date filters
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  
  let dateFilter = `AND p.created_at >= '${yearStart}' AND p.created_at <= '${yearEnd}'`;
  
  if (month !== "all") {
    const monthStart = `${year}-${month.padStart(2, '0')}-01`;
    const monthEnd = new Date(parseInt(year), parseInt(month), 0).getDate();
    const monthEndDate = `${year}-${month.padStart(2, '0')}-${monthEnd}`;
    dateFilter = `AND p.created_at >= '${monthStart}' AND p.created_at <= '${monthEndDate}'`;
  }

  // Get all payments for host spaces with space details
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      host_amount,
      created_at,
      booking_id,
      payment_status,
      bookings!inner (
        id,
        space_id,
        spaces!inner (
          id,
          title,
          host_id
        )
      )
    `)
    .eq('bookings.spaces.host_id', hostId)
    .eq('payment_status', 'completed')
    .gte('created_at', yearStart)
    .lte('created_at', yearEnd)
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
    throw paymentsError;
  }

  // Filter by month if specified
  let filteredPayments = payments || [];
  if (month !== "all") {
    filteredPayments = filteredPayments.filter(payment => {
      const paymentMonth = new Date(payment.created_at).getMonth() + 1;
      return paymentMonth === parseInt(month);
    });
  }

  // Calculate totals
  const totalRevenue = filteredPayments.reduce((sum, payment) => sum + (payment.host_amount || 0), 0);
  const totalBookings = filteredPayments.length;

  // Format recent payouts
  const recentPayouts = filteredPayments.map(payment => ({
    id: payment.id,
    amount: payment.host_amount || 0,
    date: payment.created_at,
    booking_id: payment.booking_id,
    space_title: payment.bookings?.spaces?.title || 'N/A'
  }));

  // Calculate monthly revenue for the year
  const monthlyRevenue = [];
  for (let m = 1; m <= 12; m++) {
    const monthPayments = (payments || []).filter(payment => {
      const paymentMonth = new Date(payment.created_at).getMonth() + 1;
      return paymentMonth === m;
    });
    
    monthlyRevenue.push({
      month: new Date(parseInt(year), m - 1).toLocaleDateString('it-IT', { month: 'short' }),
      revenue: monthPayments.reduce((sum, p) => sum + (p.host_amount || 0), 0),
      bookings: monthPayments.length
    });
  }

  return {
    totalRevenue,
    totalBookings,
    recentPayouts,
    monthlyRevenue
  };
};

export const getHostDAC7Data = async (hostId: string, year: number): Promise<DAC7Data> => {
  const { data, error } = await supabase
    .from('dac7_reports')
    .select('*')
    .eq('host_id', hostId)
    .eq('reporting_year', year)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching DAC7 data:', error);
    throw error;
  }

  if (!data) {
    // Calculate DAC7 thresholds if no report exists
    const { data: calculatedData, error: calcError } = await supabase.rpc('calculate_dac7_thresholds', {
      host_id_param: hostId,
      year_param: year
    });

    if (calcError) {
      console.error('Error calculating DAC7 thresholds:', calcError);
      throw calcError;
    }

    const dac7: Dac7ThresholdResult = calculatedData as unknown as Dac7ThresholdResult;

    return {
      totalIncome: dac7?.total_income || 0,
      totalTransactions: dac7?.total_transactions || 0,
      thresholdMet: dac7?.threshold_met || false,
      reportingYear: year
    };
  }

  return {
    totalIncome: data.total_income || 0,
    totalTransactions: data.total_transactions || 0,
    thresholdMet: data.reporting_threshold_met || false,
    reportingYear: data.reporting_year
  };
};

export const exportDAC7Report = async (hostId: string, year: number): Promise<string> => {
  // Get host profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, tax_id, tax_country')
    .eq('id', hostId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    throw profileError;
  }

  // Get payments for the year
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      host_amount,
      created_at,
      bookings!inner (
        id,
        booking_date,
        spaces!inner (
          id,
          title,
          host_id
        )
      )
    `)
    .eq('bookings.spaces.host_id', hostId)
    .eq('payment_status', 'completed')
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`)
    .order('created_at', { ascending: true });

  if (paymentsError) {
    console.error('Error fetching payments for export:', paymentsError);
    throw paymentsError;
  }

  // Create CSV content
  const headers = [
    'Data Pagamento',
    'Importo (EUR)',
    'Spazio',
    'Data Prenotazione',
    'ID Transazione'
  ];

  const csvRows = [
    headers.join(','),
    `# Report DAC7 per ${profile?.first_name} ${profile?.last_name}`,
    `# Anno: ${year}`,
    `# P.IVA/Codice Fiscale: ${profile?.tax_id || 'N/A'}`,
    `# Paese: ${profile?.tax_country || 'N/A'}`,
    `# Generato il: ${new Date().toLocaleDateString('it-IT')}`,
    '',
    ...((payments || []).map(payment => [
      new Date(payment.created_at).toLocaleDateString('it-IT'),
      (payment.host_amount || 0).toFixed(2),
      `"${payment.bookings?.spaces?.title || 'N/A'}"`,
      new Date(payment.bookings?.booking_date || '').toLocaleDateString('it-IT'),
      payment.id
    ].join(',')))
  ];

  // Add summary
  const totalIncome = (payments || []).reduce((sum, p) => sum + (p.host_amount || 0), 0);
  const totalTransactions = (payments || []).length;
  
  csvRows.push('');
  csvRows.push('# RIEPILOGO');
  csvRows.push(`# Totale Ricavi: €${totalIncome.toFixed(2)}`);
  csvRows.push(`# Totale Transazioni: ${totalTransactions}`);
  csvRows.push(`# Soglia DAC7 Raggiunta: ${totalIncome >= 2000 && totalTransactions >= 25 ? 'SI' : 'NO'}`);

  return csvRows.join('\n');
};
