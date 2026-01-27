
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';
import type { PaymentWithBookingSpaceJoin } from "@/types/supabase-joins";

export const exportDAC7Report = async (hostId: string, year: number): Promise<string> => {
  // Get host profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, last_name, tax_id, tax_country')
    .eq('id', hostId)
    .single();

  if (profileError) {
    sreLogger.error('Error fetching profile', { error: profileError, hostId });
    throw profileError;
  }

  // Get payments for the year
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select(`
      id,
      host_amount,
      created_at,
      bookings:bookings!fk_payments_booking_id (
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
    .order('created_at', { ascending: true })
    .overrideTypes<PaymentWithBookingSpaceJoin[]>();

  if (paymentsError) {
    sreLogger.error('Error fetching payments for export', { error: paymentsError, hostId, year });
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

  const paymentsData = payments || [];
  const csvRows = [
    headers.join(','),
    `# Report DAC7 per ${profile?.first_name} ${profile?.last_name}`,
    `# Anno: ${year}`,
    `# P.IVA/Codice Fiscale: ${profile?.tax_id || 'N/A'}`,
    `# Paese: ${profile?.tax_country || 'N/A'}`,
    `# Generato il: ${new Date().toLocaleDateString('it-IT')}`,
    '',
    ...(paymentsData.map(payment => [
      new Date(payment.created_at || new Date()).toLocaleDateString('it-IT'),
      (payment.host_amount || 0).toFixed(2),
      `"${payment.bookings?.spaces?.title || 'N/A'}"`,
      new Date(payment.bookings?.booking_date || new Date()).toLocaleDateString('it-IT'),
      payment.id
    ].join(',')))
  ];

  // Add summary
  const totalIncome = paymentsData.reduce((sum, p) => sum + (p.host_amount || 0), 0);
  const totalTransactions = paymentsData.length;
  
  csvRows.push('');
  csvRows.push('# RIEPILOGO');
  csvRows.push(`# Totale Ricavi: €${totalIncome.toFixed(2)}`);
  csvRows.push(`# Totale Transazioni: ${totalTransactions}`);
  csvRows.push(`# Soglia DAC7 Raggiunta: ${totalIncome >= 2000 && totalTransactions >= 25 ? 'SI' : 'NO'}`);

  return csvRows.join('\n');
};
