
import { ErrorHandler } from "../utils/error-handler.ts";

export class NotificationService {
  static async sendBookingNotification(
    supabaseAdmin: any,
    userId: string,
    title: string,
    content: string,
    metadata: any
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: 'booking',
          title,
          content,
          metadata
        });

      if (error) {
        ErrorHandler.logError('Error sending booking notification', error);
      } else {
        ErrorHandler.logSuccess('Booking notification sent', { userId, title });
      }
    } catch (error) {
      ErrorHandler.logError('Notification service error', error);
    }
  }

  static async sendRefundNotification(
    supabaseAdmin: any,
    userId: string,
    bookingId: string,
    refund: any
  ): Promise<void> {
    try {
      // 1. Send In-App Notification
      const { error } = await supabaseAdmin
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: 'booking',
          title: 'Rimborso completato',
          content: 'Il rimborso per la prenotazione cancellata è stato elaborato con successo',
          metadata: {
            booking_id: bookingId,
            refund_amount: refund.amount / 100,
            currency: refund.currency,
            refund_id: refund.id
          }
        });

      if (error) {
        ErrorHandler.logError('Error sending refund notification', error);
      } else {
        ErrorHandler.logSuccess('Refund notification sent', { userId, bookingId });
      }

      // 2. Dispatch Email via send-booking-notification
      await supabaseAdmin.functions.invoke('send-booking-notification', {
        body: {
          type: 'refund_processed',
          booking_id: bookingId,
          metadata: {
            refund_amount: refund.amount / 100
          }
        }
      }).then(({ error: emailError }: any) => {
        if (emailError) ErrorHandler.logError('Failed to dispatch refund email', emailError);
        else ErrorHandler.logSuccess('Refund email dispatched');
      });

    } catch (error) {
      ErrorHandler.logError('Refund notification service error', error);
    }
  }

  static async sendBookingNotifications(
    supabaseAdmin: any,
    booking: any
  ): Promise<void> {
    // This method is kept for backward compatibility with existing code
    const confirmationType = booking.workspaces?.confirmation_type || 'instant';
    
    // Send In-App & Email based on type
    if (confirmationType === 'instant') {
      await this.sendBookingNotification(
        supabaseAdmin,
        booking.user_id,
        'Prenotazione confermata!',
        `La tua prenotazione presso "${booking.workspaces.title}" è stata confermata automaticamente.`,
        {
          booking_id: booking.id,
          space_title: booking.workspaces.title,
          confirmation_type: confirmationType
        }
      );

      // Dispatch Email
      await supabaseAdmin.functions.invoke('send-booking-notification', {
        body: {
          type: 'booking_confirmation',
          booking_id: booking.id,
          metadata: {
            amount: booking.fiscal_data?.total_amount
          }
        }
      }).then(({ error: emailError }: any) => {
        if (emailError) ErrorHandler.logError('Failed to dispatch confirmation email', emailError);
        else ErrorHandler.logSuccess('Confirmation email dispatched');
      });

    } else {
      // For Request/Approval flow
      await this.sendBookingNotification(
        supabaseAdmin,
        booking.user_id,
        'Richiesta inviata',
        `La richiesta per "${booking.workspaces.title}" è stata inviata all'host.`,
        {
          booking_id: booking.id,
          space_title: booking.workspaces.title,
          confirmation_type: confirmationType
        }
      );

      await supabaseAdmin.functions.invoke('send-booking-notification', {
        body: {
          type: 'booking_pending',
          booking_id: booking.id
        }
      }).then(({ error: emailError }: any) => {
        if (emailError) ErrorHandler.logError('Failed to dispatch pending email', emailError);
      });
    }
  }
}
