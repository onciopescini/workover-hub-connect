import { ErrorHandler } from "../utils/error-handler.ts";
import { PaymentCalculator } from "../utils/payment-calculator.ts";

export class InvoiceService {
  static async generateHostInvoice(
    supabaseAdmin: any,
    paymentId: string,
    bookingId: string,
    hostId: string,
    breakdown: ReturnType<typeof PaymentCalculator.calculateBreakdown>
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    try {
      ErrorHandler.logInfo('Generating host invoice', { paymentId, bookingId, hostId });

      const { data, error } = await supabaseAdmin.functions.invoke('generate-host-invoice', {
        body: {
          payment_id: paymentId,
          booking_id: bookingId,
          host_id: hostId,
          breakdown: {
            host_fee: breakdown.hostFeeAmount,
            host_vat: Math.round(breakdown.hostFeeAmount * 0.22 * 100) / 100, // 22% VAT on host fee
            total: breakdown.hostFeeAmount + Math.round(breakdown.hostFeeAmount * 0.22 * 100) / 100
          }
        }
      });

      if (error) {
        ErrorHandler.logError('Failed to generate host invoice', error);
        return { success: false, error: error.message };
      }

      if (!data?.success || !data?.invoice?.id) {
        ErrorHandler.logError('Invalid response from invoice generation', data);
        return { success: false, error: 'Invalid invoice response' };
      }

      ErrorHandler.logSuccess('Host invoice generated successfully', {
        invoiceId: data.invoice.id,
        invoiceNumber: data.invoice.invoice_number
      });

      return { success: true, invoiceId: data.invoice.id };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      ErrorHandler.logError('Error in invoice generation service', err);
      return { success: false, error: err.message };
    }
  }
}
