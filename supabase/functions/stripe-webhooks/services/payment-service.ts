
import { StripeConfig } from "../utils/stripe-config.ts";
import { PaymentCalculator } from "../utils/payment-calculator.ts";
import { ErrorHandler } from "../utils/error-handler.ts";

export class PaymentService {
  static async updatePaymentStatus(
    supabaseAdmin: any,
    sessionId: string,
    status: string,
    receiptUrl?: string,
    paymentIntentId?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { payment_status: status };
      if (receiptUrl) {
        updateData.receipt_url = receiptUrl;
      }
      if (paymentIntentId) {
        updateData.stripe_payment_intent_id = paymentIntentId;
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
    // With destination charges, the transfer is handled automatically by Stripe
    // We just need to log the transfer details for our records
    if (!hostProfile?.stripe_connected || !hostProfile.stripe_account_id) {
      ErrorHandler.logWarning('Host Stripe account not connected');
      return null;
    }

    try {
      ErrorHandler.logSuccess('Destination charge transfer will be handled automatically by Stripe', {
        hostAccount: hostProfile.stripe_account_id,
        transferAmount: breakdown.stripeTransferAmount,
        applicationFee: breakdown.stripeApplicationFee
      });
      
      // Return a placeholder transfer ID since Stripe handles this automatically
      return `auto_transfer_${bookingId}`;
    } catch (error) {
      ErrorHandler.logError('Error in transfer logging', error);
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
          host_amount: breakdown.hostNetPayout,
          platform_fee: breakdown.platformRevenue
        })
        .eq('stripe_session_id', sessionId);

      ErrorHandler.logSuccess('Transfer details recorded');
    } catch (error) {
      ErrorHandler.logError('Error recording transfer details', error);
    }
  }
}
