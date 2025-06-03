
import Stripe from "https://esm.sh/stripe@15.0.0";
import { PaymentService } from "../services/payment-service.ts";
import { NotificationService } from "../services/notification-service.ts";
import { ErrorHandler } from "../utils/error-handler.ts";
import type { EventHandlerResult } from "../types/webhook-types.ts";

export class PaymentHandlers {
  static async handleRefundCreated(
    refund: Stripe.Refund,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logInfo('Refund created', { refundId: refund.id });
    
    // Find the corresponding payment using payment_intent
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('booking_id, user_id')
      .eq('stripe_session_id', refund.payment_intent)
      .single();
      
    if (paymentError) {
      ErrorHandler.logError('Error finding payment for refund', paymentError);
      return { success: false, error: 'Payment not found' };
    }
    
    if (payment) {
      // Update payment status
      const paymentUpdated = await PaymentService.updatePaymentStatus(
        supabaseAdmin,
        refund.payment_intent as string,
        'refunded'
      );

      if (!paymentUpdated) {
        return { success: false, error: 'Failed to update payment status' };
      }
      
      // Send refund notification
      await NotificationService.sendRefundNotification(
        supabaseAdmin,
        payment.user_id,
        payment.booking_id,
        refund
      );
      
      ErrorHandler.logSuccess('Refund processed and user notified');
      return { success: true, message: 'Refund processed successfully' };
    }

    return { success: false, error: 'No payment found for refund' };
  }

  static async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logError('Payment failed', paymentIntent.last_payment_error?.message, {
      paymentIntentId: paymentIntent.id
    });
    
    const paymentUpdated = await PaymentService.updatePaymentStatus(
      supabaseAdmin,
      paymentIntent.id,
      'failed'
    );

    if (!paymentUpdated) {
      return { success: false, error: 'Failed to update payment status' };
    }

    return { success: true, message: 'Failed payment processed successfully' };
  }
}
