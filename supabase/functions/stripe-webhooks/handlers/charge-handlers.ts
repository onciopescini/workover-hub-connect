
import Stripe from "https://esm.sh/stripe@15.0.0";
import { ErrorHandler } from "../utils/error-handler.ts";
import type { EventHandlerResult } from "../types/webhook-types.ts";

export class ChargeHandlers {
  static async handleChargeSucceeded(
    charge: Stripe.Charge,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logInfo('Charge succeeded', { 
      chargeId: charge.id,
      amount: charge.amount,
      paymentIntent: charge.payment_intent
    });
    
    // Update payment metadata if needed
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        method: charge.payment_method_details?.type || 'card'
      })
      .eq('stripe_session_id', charge.payment_intent);

    if (updateError) {
      ErrorHandler.logWarning('Could not update payment method', updateError);
    }

    ErrorHandler.logSuccess('Charge processed successfully');
    return { success: true, message: 'Charge succeeded processed' };
  }

  static async handleChargeRefunded(
    charge: Stripe.Charge,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logInfo('Charge refunded', { 
      chargeId: charge.id,
      amountRefunded: charge.amount_refunded
    });
    
    // Log refund details
    const { error: logError } = await supabaseAdmin
      .from('payments')
      .update({
        payment_status: 'refunded'
      })
      .eq('stripe_session_id', charge.payment_intent);

    if (logError) {
      ErrorHandler.logError('Failed to update payment on charge refund', logError);
      return { success: false, error: 'Failed to update payment status' };
    }

    ErrorHandler.logSuccess('Charge refund recorded');
    return { success: true, message: 'Charge refund processed' };
  }
}
