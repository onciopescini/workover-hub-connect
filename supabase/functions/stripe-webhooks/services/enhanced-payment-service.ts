
import { StripeConfig } from "../utils/stripe-config.ts";
import { PaymentCalculator } from "../utils/payment-calculator.ts";
import { ErrorHandler } from "../utils/error-handler.ts";

export class EnhancedPaymentService {
  static async updatePaymentWithBreakdown(
    supabaseAdmin: any,
    sessionId: string,
    session: any,
    breakdown: ReturnType<typeof PaymentCalculator.calculateBreakdown>,
    eventId?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        payment_status: 'completed',
        receipt_url: session.receipt_url,
        host_amount: breakdown.hostNetPayout,
        platform_fee: breakdown.platformRevenue
      };

      // Add idempotency key if provided
      if (eventId) {
        updateData.stripe_event_id = eventId;
      }

      ErrorHandler.logInfo('Updating payment with breakdown', {
        sessionId,
        updateData
      });

      const { error } = await supabaseAdmin
        .from('payments')
        .update(updateData)
        .eq('stripe_session_id', sessionId);

      if (error) {
        ErrorHandler.logError('Error updating payment with breakdown', error);
        return false;
      }

      ErrorHandler.logSuccess('Payment updated with breakdown successfully');
      return true;
    } catch (error) {
      ErrorHandler.logError('Enhanced payment service error', error);
      return false;
    }
  }

  static async getPaymentBySessionId(
    supabaseAdmin: any,
    sessionId: string
  ): Promise<any> {
    try {
      const { data, error } = await supabaseAdmin
        .from('payments')
        .select(`
          *,
          bookings!inner (
            id,
            status,
            space_id,
            user_id,
            spaces!inner (
              id,
              title:name,
              host_id,
              confirmation_type
            )
          )
        `)
        .eq('stripe_session_id', sessionId)
        .single();

      if (error) {
        ErrorHandler.logError('Error fetching payment by session ID', error);
        return null;
      }

      return data;
    } catch (error) {
      ErrorHandler.logError('Error in getPaymentBySessionId', error);
      return null;
    }
  }

  static async validatePaymentMetadata(session: any): Promise<boolean> {
    const requiredFields = ['booking_id', 'base_amount'];
    
    for (const field of requiredFields) {
      if (!session.metadata?.[field]) {
        // Special handling for base_amount - try to retrieve from PaymentIntent
        if (field === 'base_amount' && session.payment_intent) {
          try {
            ErrorHandler.logInfo('Attempting to retrieve base_amount from PaymentIntent', {
              sessionId: session.id,
              paymentIntentId: session.payment_intent
            });
            
            const stripe = StripeConfig.getInstance();
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
            
            if (paymentIntent.metadata?.base_amount) {
              // Copy the base_amount to session metadata for consistency
              session.metadata = session.metadata || {};
              session.metadata.base_amount = paymentIntent.metadata.base_amount;
              
              ErrorHandler.logSuccess('Retrieved base_amount from PaymentIntent', {
                baseAmount: paymentIntent.metadata.base_amount
              });
              continue;
            }
          } catch (error) {
            ErrorHandler.logError('Failed to retrieve base_amount from PaymentIntent', error);
          }
        }
        
        ErrorHandler.logError(`Missing required metadata field: ${field}`, {
          sessionId: session.id,
          metadata: session.metadata
        });
        return false;
      }
    }

    return true;
  }
}
