
import Stripe from "https://esm.sh/stripe@15.0.0";
import { PaymentService } from "../services/payment-service.ts";
import { BookingService } from "../services/booking-service.ts";
import { ProfileService } from "../services/profile-service.ts";
import { NotificationService } from "../services/notification-service.ts";
import { InvoiceService } from "../services/invoice-service.ts";
import { PaymentCalculator } from "../utils/payment-calculator.ts";
import { ErrorHandler } from "../utils/error-handler.ts";
import { Validators } from "../utils/validators.ts";
import type { EventHandlerResult } from "../types/webhook-types.ts";

export class CheckoutHandlers {
  static async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    supabaseAdmin: any,
    eventId?: string
  ): Promise<EventHandlerResult> {
    ErrorHandler.logInfo('Checkout session completed', { sessionId: session.id, eventId });

    // IDEMPOTENCY CHECK: Previene doppi pagamenti
    if (eventId) {
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('stripe_event_id', eventId)
        .maybeSingle();
      
      if (existingPayment) {
        ErrorHandler.logInfo('Event already processed (idempotency)', { eventId, paymentId: existingPayment.id });
        return { success: true, message: 'Duplicate event ignored' };
      }
    }
    
    if (!Validators.validateBookingMetadata(session.metadata)) {
      return { success: false, error: 'Invalid booking metadata' };
    }

    const bookingId = session.metadata!.booking_id;
    const totalAmount = session.amount_total || 0;
    const breakdown = PaymentCalculator.calculateBreakdown(totalAmount);
    
    PaymentCalculator.logBreakdown(breakdown);

    // Update payment status
    const paymentUpdated = await PaymentService.updatePaymentStatus(
      supabaseAdmin,
      session.id,
      'completed',
      session.receipt_url || undefined
    );

    if (!paymentUpdated) {
      return { success: false, error: 'Failed to update payment' };
    }

    // Get booking details
    const booking = await BookingService.getBookingDetails(supabaseAdmin, bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    // Determine booking status and update
    const { status: newStatus } = BookingService.determineBookingStatus(booking.spaces.confirmation_type);
    const bookingUpdated = await BookingService.updateBookingStatus(supabaseAdmin, bookingId, newStatus);
    
    if (!bookingUpdated) {
      return { success: false, error: 'Failed to update booking' };
    }

    // Handle host transfer and notifications
    await this.handleHostTransferAndNotifications(booking, breakdown, session, supabaseAdmin);

    return { success: true, message: 'Checkout session processed successfully' };
  }

  static async handleCheckoutSessionExpired(
    session: Stripe.Checkout.Session,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logWarning('Checkout session expired', { sessionId: session.id });
    
    const paymentUpdated = await PaymentService.updatePaymentStatus(
      supabaseAdmin,
      session.id,
      'failed'
    );

    if (!paymentUpdated) {
      return { success: false, error: 'Failed to update expired payment' };
    }

    return { success: true, message: 'Expired session processed successfully' };
  }

  private static async handleHostTransferAndNotifications(
    booking: any,
    breakdown: ReturnType<typeof PaymentCalculator.calculateBreakdown>,
    session: Stripe.Checkout.Session,
    supabaseAdmin: any
  ): Promise<void> {
    // Get host profile for transfer
    const hostProfile = await ProfileService.getHostProfile(supabaseAdmin, booking.spaces.host_id);
    
    // Create transfer if host is connected
    const transferId = await PaymentService.createHostTransfer(
      hostProfile,
      breakdown,
      booking.id,
      booking.space_id,
      booking.spaces.host_id
    );

    // Record transfer details
    await PaymentService.recordTransferDetails(supabaseAdmin, session.id, transferId, breakdown);

    // Get payment ID for invoice generation
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('stripe_session_id', session.id)
      .single();

    // Generate host invoice
    if (payment?.id) {
      const invoiceResult = await InvoiceService.generateHostInvoice(
        supabaseAdmin,
        payment.id,
        booking.id,
        booking.spaces.host_id,
        breakdown
      );

      if (!invoiceResult.success) {
        ErrorHandler.logError('Host invoice generation failed', { error: invoiceResult.error });
      }
    }

    // Send notifications
    await NotificationService.sendBookingNotifications(supabaseAdmin, booking);
  }
}
