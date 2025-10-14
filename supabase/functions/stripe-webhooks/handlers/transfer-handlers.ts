
import Stripe from "https://esm.sh/stripe@15.0.0";
import { ErrorHandler } from "../utils/error-handler.ts";
import type { EventHandlerResult } from "../types/webhook-types.ts";

export class TransferHandlers {
  static async handleTransferCreated(
    transfer: Stripe.Transfer,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logInfo('Transfer created', { 
      transferId: transfer.id,
      amount: transfer.amount,
      destination: transfer.destination
    });
    
    // Extract booking_id from metadata
    const bookingId = transfer.metadata?.booking_id;
    
    if (!bookingId) {
      ErrorHandler.logWarning('Transfer without booking_id in metadata', { transferId: transfer.id });
      return { success: true, message: 'Transfer logged without booking association' };
    }

    // Update payment with transfer ID
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        stripe_transfer_id: transfer.id,
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId);

    if (updateError) {
      ErrorHandler.logError('Failed to update payment with transfer_id', updateError);
      return { success: false, error: 'Failed to record transfer' };
    }

    ErrorHandler.logSuccess('Transfer recorded successfully', {
      transferId: transfer.id,
      bookingId
    });

    return { success: true, message: 'Transfer created and recorded' };
  }

  static async handlePayoutCreated(
    payout: Stripe.Payout,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logInfo('Payout created', { 
      payoutId: payout.id,
      amount: payout.amount,
      status: payout.status,
      arrivalDate: payout.arrival_date
    });
    
    // Log payout event for host tracking
    // In future: update host_payouts table or send notification
    
    ErrorHandler.logSuccess('Payout logged successfully');
    return { success: true, message: 'Payout created and logged' };
  }
}
