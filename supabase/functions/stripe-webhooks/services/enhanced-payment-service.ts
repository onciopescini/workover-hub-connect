
import { StripeConfig } from "../utils/stripe-config.ts";
import { PaymentCalculator } from "../utils/payment-calculator.ts";
import { ErrorHandler } from "../utils/error-handler.ts";

export class EnhancedPaymentService {
  static async updatePaymentWithBreakdown(
    supabaseAdmin: any,
    sessionId: string,
    session: any,
    breakdown: ReturnType<typeof PaymentCalculator.calculateBreakdown>
  ): Promise<boolean> {
    try {
      const updateData = {
        payment_status: 'completed',
        receipt_url: session.receipt_url,
        host_amount: breakdown.hostNetPayout,
        platform_fee: breakdown.platformRevenue,
        updated_at: new Date().toISOString()
      };

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
            space_id,
            user_id,
            spaces!inner (
              id,
              title,
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
