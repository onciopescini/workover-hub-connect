import { format } from "date-fns";
import { it } from "date-fns/locale";

export function calculatePlatformFee(amount: number, feePercentage: number = 5): number {
  return amount * (feePercentage / 100);
}

export function calculateHostAmount(amount: number, feePercentage: number = 5): number {
  return amount - calculatePlatformFee(amount, feePercentage);
}

// DEPRECATED: Use exportAdminCSV from admin-csv-export.ts instead
// This function is kept for backward compatibility but should not be used
// as it's vulnerable to client-side tampering and lacks audit logging
export function exportPaymentsToCSV(payments: any[]) {
  console.warn('[DEPRECATED] exportPaymentsToCSV is deprecated. Use exportAdminCSV instead.');
  
  const headers = [
    'ID Pagamento',
    'Data',
    'Importo Totale',
    'Host Amount',
    'Platform Fee',
    'Stato',
    'Metodo',
    'Utente',
    'Spazio',
    'Stripe Session ID'
  ];

  const rows = payments.map(payment => [
    payment.id,
    format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: it }),
    payment.amount.toFixed(2),
    payment.host_amount?.toFixed(2) || '0.00',
    payment.platform_fee?.toFixed(2) || '0.00',
    payment.payment_status,
    payment.method || 'N/A',
    `${payment.booking?.coworker?.first_name || ''} ${payment.booking?.coworker?.last_name || ''}`,
    payment.booking?.space?.title || '',
    payment.stripe_session_id || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `pagamenti_${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function detectPaymentAnomalies(payment: any): string[] {
  const anomalies: string[] = [];

  if (payment.payment_status === 'completed') {
    // Check for missing breakdown
    if (!payment.host_amount || !payment.platform_fee) {
      anomalies.push("Missing host_amount or platform_fee");
    }

    // Check for amount mismatch
    if (payment.host_amount && payment.platform_fee) {
      const expectedTotal = Number(payment.host_amount) + Number(payment.platform_fee);
      const actualTotal = Number(payment.amount);
      if (Math.abs(expectedTotal - actualTotal) > 0.02) {
        anomalies.push(`Amount mismatch: expected ${expectedTotal.toFixed(2)}, got ${actualTotal.toFixed(2)}`);
      }
    }

    // Check for unreasonably high platform fee
    if (payment.platform_fee) {
      const feePercentage = (Number(payment.platform_fee) / Number(payment.amount)) * 100;
      if (feePercentage > 15) {
        anomalies.push(`Unusually high platform fee: ${feePercentage.toFixed(1)}%`);
      }
    }
  }

  return anomalies;
}
