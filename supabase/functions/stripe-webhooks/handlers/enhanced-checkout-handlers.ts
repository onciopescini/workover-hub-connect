
import Stripe from "https://esm.sh/stripe@15.0.0";
import { EnhancedPaymentService } from "../services/enhanced-payment-service.ts";
import { BookingService } from "../services/booking-service.ts";
import { NotificationService } from "../services/notification-service.ts";
import { EnhancedPaymentCalculator } from "../utils/enhanced-payment-calculator.ts";
import { ErrorHandler } from "../utils/error-handler.ts";
import type { EventHandlerResult } from "../types/webhook-types.ts";

export class EnhancedCheckoutHandlers {
  static async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logInfo('Processing checkout session completed', { 
      sessionId: session.id,
      paymentStatus: session.payment_status,
      sessionStatus: session.status
    });
    
    // Validate payment was successful
    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      ErrorHandler.logWarning('Session not completed successfully', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        sessionStatus: session.status
      });
      return { success: false, error: 'Session not completed successfully' };
    }

    // Validate metadata
    if (!await EnhancedPaymentService.validatePaymentMetadata(session)) {
      return { success: false, error: 'Invalid session metadata' };
    }

    const bookingId = session.metadata!.booking_id;
    const baseAmount = parseFloat(session.metadata!.base_amount);
    
    // Calculate breakdown
    const breakdown = EnhancedPaymentCalculator.calculateBreakdown(baseAmount);
    EnhancedPaymentCalculator.logBreakdown(breakdown);

    // Validate amount matches
    if (!EnhancedPaymentCalculator.validateBreakdown(breakdown, session.amount_total || 0)) {
      return { success: false, error: 'Payment amount validation failed' };
    }

    // Get payment details
    const payment = await EnhancedPaymentService.getPaymentBySessionId(supabaseAdmin, session.id);
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    // Update payment with breakdown
    const paymentUpdated = await EnhancedPaymentService.updatePaymentWithBreakdown(
      supabaseAdmin,
      session.id,
      session,
      breakdown
    );

    if (!paymentUpdated) {
      return { success: false, error: 'Failed to update payment' };
    }

    // Get booking details
    const booking = payment.bookings;
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    // Determine new booking status
    const confirmationType = booking.spaces.confirmation_type;
    const newStatus = confirmationType === 'instant' ? 'confirmed' : 'pending';
    
    // Update booking status
    const bookingUpdated = await BookingService.updateBookingStatus(
      supabaseAdmin,
      bookingId,
      newStatus
    );
    
    if (!bookingUpdated) {
      return { success: false, error: 'Failed to update booking status' };
    }

    ErrorHandler.logSuccess('Booking status updated', {
      bookingId,
      newStatus,
      confirmationType
    });

    // Send notifications
    await this.sendCompletionNotifications(booking, breakdown, supabaseAdmin);

    return { 
      success: true, 
      message: `Checkout session processed successfully. Booking ${newStatus}.`
    };
  }

  static async handleCheckoutSessionExpired(
    session: Stripe.Checkout.Session,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logWarning('Checkout session expired', { sessionId: session.id });
    
    const paymentUpdated = await EnhancedPaymentService.updatePaymentWithBreakdown(
      supabaseAdmin,
      session.id,
      { payment_status: 'failed' },
      { hostNetPayout: 0, platformRevenue: 0 } as any
    );

    if (!paymentUpdated) {
      return { success: false, error: 'Failed to update expired payment' };
    }

    return { success: true, message: 'Expired session processed successfully' };
  }

  private static async sendCompletionNotifications(
    booking: any,
    breakdown: ReturnType<typeof EnhancedPaymentCalculator.calculateBreakdown>,
    supabaseAdmin: any
  ): Promise<void> {
    const confirmationType = booking.spaces.confirmation_type;
    
    // Notification to coworker
    const coworkerTitle = confirmationType === 'instant' 
      ? 'Prenotazione confermata!'
      : 'Pagamento completato - In attesa di approvazione';
    
    const coworkerContent = confirmationType === 'instant'
      ? `La tua prenotazione presso "${booking.spaces.title}" è stata confermata automaticamente. Buon lavoro!`
      : `Il pagamento per "${booking.spaces.title}" è stato completato. In attesa dell'approvazione dell'host.`;

    await NotificationService.sendBookingNotification(
      supabaseAdmin,
      booking.user_id,
      coworkerTitle,
      coworkerContent,
      {
        booking_id: booking.id,
        space_title: booking.spaces.title,
        confirmation_type: confirmationType,
        amount_paid: breakdown.buyerTotalAmount,
        status: confirmationType === 'instant' ? 'confirmed' : 'pending'
      }
    );

    // Notification to host
    if (confirmationType === 'instant') {
      await NotificationService.sendBookingNotification(
        supabaseAdmin,
        booking.spaces.host_id,
        'Nuova prenotazione confermata',
        `Hai ricevuto una prenotazione per "${booking.spaces.title}". Riceverai €${breakdown.hostNetPayout.toFixed(2)} come pagamento.`,
        {
          booking_id: booking.id,
          space_title: booking.spaces.title,
          payment_received: true,
          host_payout: breakdown.hostNetPayout,
          auto_confirmed: true
        }
      );
    } else {
      await NotificationService.sendBookingNotification(
        supabaseAdmin,
        booking.spaces.host_id,
        'Nuova richiesta di prenotazione',
        `Hai ricevuto una richiesta di prenotazione per "${booking.spaces.title}". Vai alla dashboard per approvarla.`,
        {
          booking_id: booking.id,
          space_title: booking.spaces.title,
          action_required: 'approve_booking',
          host_payout: breakdown.hostNetPayout,
          payment_completed: true
        }
      );
    }
  }
}
