
import { StripeConfig } from "../utils/stripe-config.ts";
import { PaymentCalculator } from "../utils/payment-calculator.ts";
import { ErrorHandler } from "../utils/error-handler.ts";

export class PaymentService {
  static async updatePaymentStatus(
    supabaseAdmin: any,
    sessionId: string,
    status: string,
    receiptUrl?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { payment_status: status };
      if (receiptUrl) {
        updateData.receipt_url = receiptUrl;
      }

      const { error } = await supabaseAdmin
        .from('payments')
        .update(updateData)
        .eq('stripe_session_id', sessionId);

      if (error) {
        ErrorHandler.logError('Error updating payment status', error);
        return false;
      }

      ErrorHandler.logSuccess('Payment status updated successfully');
      return true;
    } catch (error) {
      ErrorHandler.logError('Payment service error', error);
      return false;
    }
  }

  static async createHostTransfer(
    hostProfile: any,
    breakdown: ReturnType<typeof PaymentCalculator.calculateBreakdown>,
    bookingId: string,
    spaceId: string,
    hostId: string
  ): Promise<string | null> {
    if (!hostProfile?.stripe_connected || !hostProfile.stripe_account_id) {
      ErrorHandler.logWarning('Host Stripe account not connected, skipping transfer');
      return null;
    }

    try {
      const stripe = StripeConfig.getInstance();
      
      const transfer = await stripe.transfers.create({
        amount: breakdown.hostTransferAmount,
        currency: 'eur',
        destination: hostProfile.stripe_account_id,
        description: `Pagamento per prenotazione ${bookingId}`,
        metadata: {
          booking_id: bookingId,
          space_id: spaceId,
          host_id: hostId
        }
      });

      ErrorHandler.logSuccess('Transfer created successfully', { transferId: transfer.id });
      return transfer.id;
    } catch (error) {
      ErrorHandler.logError('Error creating transfer', error);
      return null;
    }
  }

  static async recordTransferDetails(
    supabaseAdmin: any,
    sessionId: string,
    transferId: string | null,
    breakdown: ReturnType<typeof PaymentCalculator.calculateBreakdown>
  ): Promise<void> {
    if (!transferId) return;

    try {
      await supabaseAdmin
        .from('payments')
        .update({
          stripe_transfer_id: transferId,
          host_amount: breakdown.hostTransferAmount / 100,
          platform_fee: breakdown.platformTotalFee / 100
        })
        .eq('stripe_session_id', sessionId);

      ErrorHandler.logSuccess('Transfer details recorded');
    } catch (error) {
      ErrorHandler.logError('Error recording transfer details', error);
    }
  }
}
