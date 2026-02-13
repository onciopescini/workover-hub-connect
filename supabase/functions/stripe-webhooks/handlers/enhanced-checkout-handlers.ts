
import Stripe from "https://esm.sh/stripe@15.0.0";
import { EnhancedPaymentService } from "../services/enhanced-payment-service.ts";
import { EnhancedPaymentCalculator } from "../utils/enhanced-payment-calculator.ts";
import { ErrorHandler } from "../utils/error-handler.ts";
import type { EventHandlerResult } from "../types/webhook-types.ts";

type BookingNotificationPayload = {
  id: string;
  user_id: string;
  booking_date: string | null;
  start_time: string | null;
  end_time: string | null;
  spaces: {
    title: string;
    address: string | null;
    city_name: string | null;
    confirmation_type: string;
  };
};

export class EnhancedCheckoutHandlers {
  static async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    supabaseAdmin: any,
    eventId?: string
  ): Promise<EventHandlerResult> {
    ErrorHandler.logInfo('Processing checkout session completed', { 
      sessionId: session.id,
      paymentStatus: session.payment_status,
      sessionStatus: session.status,
      eventId
    });

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
    
    // Validate payment was successful
    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      // Relaxed check: Log warning but PROCEED to ensure we capture the Payment Intent ID
      // This is critical for "Auth & Capture" flows where status might be 'unpaid' initially
      ErrorHandler.logWarning('Session status is not strictly paid/complete, but proceeding to save Payment Intent', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        sessionStatus: session.status
      });
      // We do NOT return error here anymore. We trust checkout.session.completed event.
    }

    // Validate metadata
    if (!await EnhancedPaymentService.validatePaymentMetadata(session)) {
      return { success: false, error: 'Invalid session metadata' };
    }

    const bookingId = session.metadata!.booking_id;
    const baseAmount = parseFloat(session.metadata!.base_amount);

    // CRITICAL: Validate booking exists BEFORE any upsert operations
    if (!bookingId) {
      ErrorHandler.logError('CRITICAL: Missing booking_id in metadata', {
        sessionId: session.id,
        metadata: session.metadata
      });
      return { success: false, error: 'Missing booking_id in Stripe metadata' };
    }

    // CRITICAL: Fetch booking WITH space confirmation_type BEFORE any status determination
    const { data: bookingWithSpace, error: bookingCheckError } = await supabaseAdmin
      .from('bookings')
      .select('id, status, space_id, spaces!inner(confirmation_type)')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingCheckError) {
      ErrorHandler.logError('CRITICAL: Database error checking booking existence', {
        bookingId,
        errorMessage: bookingCheckError.message,
        errorCode: bookingCheckError.code,
        errorDetails: bookingCheckError.details,
        errorHint: bookingCheckError.hint
      });
      return { success: false, error: `DB Error: ${bookingCheckError.message} (Code: ${bookingCheckError.code})` };
    }

    if (!bookingWithSpace) {
      ErrorHandler.logError('CRITICAL: Booking not found in database', {
        bookingId,
        sessionId: session.id
      });
      return { success: false, error: `Booking ${bookingId} not found in database` };
    }

    // CRITICAL: Determine confirmation type from BOTH metadata AND database
    const metadataConfirmationType = session.metadata?.confirmation_type;
    const dbConfirmationType = bookingWithSpace.spaces?.confirmation_type;
    
    // Use EITHER source - if either says host_approval, it's manual capture
    const isManualCapture = metadataConfirmationType === 'host_approval' || 
                            dbConfirmationType === 'host_approval' ||
                            session.metadata?.capture_method === 'manual';

    // FINAL STATUS VALUES - determined ONCE, used everywhere
    const paymentStatusEnum = isManualCapture ? 'pending' : 'succeeded';
    const paymentStatus = isManualCapture ? 'pending' : 'completed';
    const targetBookingStatus = isManualCapture ? 'pending_approval' : 'confirmed';

    ErrorHandler.logInfo('FINAL status values determined BEFORE any DB operations', {
      sessionId: session.id,
      bookingId,
      currentBookingStatus: bookingWithSpace.status,
      metadataConfirmationType,
      dbConfirmationType,
      isManualCapture,
      paymentStatusEnum,
      targetBookingStatus
    });
    
    // Calculate breakdown
    const breakdown = EnhancedPaymentCalculator.calculateBreakdown(baseAmount);
    EnhancedPaymentCalculator.logBreakdown(breakdown);

    // Validate amount matches
    if (!EnhancedPaymentCalculator.validateBreakdown(breakdown, session.amount_total || 0)) {
      return { success: false, error: 'Payment amount validation failed' };
    }

    // CRITICAL FIX: Extract Payment Intent ID BEFORE database operations
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

    ErrorHandler.logInfo('Payment Intent ID extracted for upsert', {
      sessionId: session.id,
      paymentIntentId: paymentIntentId || 'NULL'
    });

    // NOTE: Status values (paymentStatusEnum, paymentStatus, targetBookingStatus) 
    // were already determined at line ~92-108 using BOTH metadata and DB confirmation_type
    // This ensures consistent values are used throughout the entire handler

    // FASE 3: Upsert idempotente del payment (crea se non esiste, aggiorna se esiste)
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id, payment_status')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existingPayment) {
      // Payment esiste → UPDATE solo se non già completed (idempotenza)
      if (existingPayment.payment_status !== 'completed') {
        const { error: updateError } = await supabaseAdmin
          .from('payments')
          .update({
            payment_status: paymentStatus,
            payment_status_enum: paymentStatusEnum,  // CRITICAL FIX: Update enum field
            stripe_payment_intent_id: paymentIntentId,  // CRITICAL FIX: Save PI ID
            receipt_url: session.receipt_url || null,
            stripe_event_id: eventId,
            host_amount: breakdown.hostNetPayout,
            platform_fee: breakdown.platformRevenue
          })
          .eq('id', existingPayment.id);

        if (updateError) {
          ErrorHandler.logError('Failed to update existing payment', updateError);
          return { success: false, error: 'Failed to update payment' };
        }
        
        ErrorHandler.logSuccess('Payment updated with PI ID and status enum', { 
          paymentId: existingPayment.id,
          paymentIntentId,
          paymentStatusEnum
        });
      } else {
        ErrorHandler.logInfo('Payment already completed (idempotency)', { paymentId: existingPayment.id });
      }
    } else {
      // Payment NON esiste → INSERT (fallback per vecchi flussi o webhook arrivato prima)
      ErrorHandler.logWarning('Payment not found, creating via webhook (fallback)', { sessionId: session.id });
      
      const { error: insertError } = await supabaseAdmin
        .from('payments')
        .insert({
          booking_id: bookingId,
          user_id: session.metadata!.user_id,
          amount: (session.amount_total || 0) / 100,
          currency: (session.currency || 'eur').toUpperCase(),
          payment_status: paymentStatus,
          payment_status_enum: paymentStatusEnum,  // CRITICAL FIX: Set enum field
          stripe_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,  // CRITICAL FIX: Save PI ID
          receipt_url: session.receipt_url || null,
          host_amount: breakdown.hostNetPayout,
          platform_fee: breakdown.platformRevenue,
          stripe_event_id: eventId,
          method: 'stripe'
        });

      if (insertError) {
        ErrorHandler.logError('Failed to insert payment in webhook', insertError);
        return { success: false, error: 'Failed to create payment' };
      }
      
      ErrorHandler.logSuccess('Payment created in webhook with PI ID and status enum', {
        paymentIntentId,
        paymentStatusEnum
      });
    }

    // Get payment details (reload per avere dati aggiornati)
    const payment = await EnhancedPaymentService.getPaymentBySessionId(supabaseAdmin, session.id);
    if (!payment) {
      return { success: false, error: 'Payment not found after upsert' };
    }

    // Get booking details
    const booking = payment.bookings;
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    // CRITICAL: Conferma solo se lo stato attuale permette il pagamento
    const currentStatus = booking.status;
    // Allow 'pending_approval' for requests that just authorized payment
    if (currentStatus !== 'pending_payment' && currentStatus !== 'pending' && currentStatus !== 'pending_approval') {
      ErrorHandler.logWarning('Booking status does not allow payment confirmation', {
        bookingId,
        currentStatus
      });
      return { success: false, error: `Booking status ${currentStatus} does not allow payment confirmation` };
    }

    // NOTE: targetBookingStatus was already determined BEFORE any DB operations at line ~100
    // Using the pre-determined value ensures consistent logic throughout the handler

    ErrorHandler.logInfo('Using Payment Intent ID for Booking Update', {
      bookingId,
      paymentIntentId,
      targetBookingStatus,
      rawPaymentIntent: typeof session.payment_intent === 'object' ? 'object' : session.payment_intent
    });

    // Update booking status and save payment intent ID
    // CRITICAL: Use targetBookingStatus determined BEFORE upsert, NOT recalculated here
    const { error: updateBookingError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: targetBookingStatus,  // CRITICAL FIX: Use pre-determined status
        stripe_payment_intent_id: paymentIntentId || null
      })
      .eq('id', bookingId);
    
    if (updateBookingError) {
      ErrorHandler.logError('Failed to update booking status and payment intent', updateBookingError);
      return { success: false, error: 'Failed to update booking status' };
    }

    ErrorHandler.logSuccess('Booking updated with status and payment intent', {
      bookingId,
      targetBookingStatus,
      isManualCapture,
      paymentIntentId: paymentIntentId || 'NULL (Warning)'
    });

    // Send centralized notification event (email delivery is handled asynchronously by process-notifications)
    await this.sendCompletionNotifications(booking, bookingId, supabaseAdmin);

    // Generate fiscal documents asynchronously (MOCK mode)
    this.generateFiscalDocuments(payment.id, bookingId, booking.spaces.host_id, booking.user_id, supabaseAdmin);

    return { 
      success: true, 
      message: `Checkout session processed successfully. Booking ${targetBookingStatus}.`
    };
  }

  private static async generateFiscalDocuments(
    paymentId: string,
    bookingId: string,
    hostId: string,
    coworkerId: string,
    supabaseAdmin: any
  ): Promise<void> {
    try {
      // Invoke edge functions to generate documents
      const [invoiceResult, receiptResult] = await Promise.allSettled([
        supabaseAdmin.functions.invoke('generate-invoice-pdf', {
          body: { payment_id: paymentId, booking_id: bookingId, host_id: hostId, coworker_id: coworkerId }
        }),
        supabaseAdmin.functions.invoke('generate-non-fiscal-receipt-pdf', {
          body: { payment_id: paymentId, booking_id: bookingId, host_id: hostId, coworker_id: coworkerId }
        })
      ]);

      if (invoiceResult.status === 'fulfilled') {
        ErrorHandler.logSuccess('Invoice generated', invoiceResult.value.data);
      } else {
        ErrorHandler.logWarning('Invoice generation failed', invoiceResult.reason);
      }

      if (receiptResult.status === 'fulfilled') {
        ErrorHandler.logSuccess('Receipt generated', receiptResult.value.data);
      } else {
        ErrorHandler.logWarning('Receipt generation failed', receiptResult.reason);
      }
    } catch (error) {
      ErrorHandler.logError('Fiscal document generation error', error);
    }
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
    booking: BookingNotificationPayload,
    bookingId: string,
    supabaseAdmin: any
  ): Promise<void> {
    const confirmationType = booking.spaces.confirmation_type;
    const notificationType = confirmationType === 'instant' ? 'booking_confirmation' : 'booking_update';
    const startDate = this.composeIsoDateTime(booking.booking_date, booking.start_time);
    const endDate = this.composeIsoDateTime(booking.booking_date, booking.end_time);
    const locationParts = [booking.spaces.address, booking.spaces.city_name].filter((value): value is string => Boolean(value && value.trim()));
    const location = locationParts.join(', ');
    
    ErrorHandler.logInfo('Creating centralized notification for paid booking', {
      bookingId: booking.id,
      confirmationType,
      notificationType
    });

    try {
      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: booking.user_id,
          type: notificationType,
          title: 'Pagamento Confermato! 🎉',
          message: 'La tua prenotazione è confermata. Trovi i dettagli nel calendario allegato.',
          metadata: {
            booking_id: bookingId,
            start_date: startDate,
            end_date: endDate,
            location,
            space_name: booking.spaces.title
          }
        });

      if (notificationError) {
        ErrorHandler.logError('Failed to create centralized booking notification', {
          bookingId,
          errorMessage: notificationError.message,
          errorCode: notificationError.code,
          errorDetails: notificationError.details,
          errorHint: notificationError.hint
        });
      } else {
        ErrorHandler.logSuccess('Centralized notification created', {
          bookingId,
          notificationType,
          userId: booking.user_id
        });
      }
    } catch (error) {
      ErrorHandler.logError('Failed to create booking notification', error);
    }
  }

  private static composeIsoDateTime(
    bookingDate: string | null,
    time: string | null
  ): string | null {
    if (!bookingDate || !time) {
      return null;
    }

    const normalizedTime = time.length === 5 ? `${time}:00` : time;
    const dateTime = new Date(`${bookingDate}T${normalizedTime}`);

    if (Number.isNaN(dateTime.getTime())) {
      return null;
    }

    return dateTime.toISOString();
  }
}
