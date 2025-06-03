
import { ErrorHandler } from "../utils/error-handler.ts";
import type { NotificationData } from "../types/domain-types.ts";

export class NotificationService {
  static async createNotification(supabaseAdmin: any, notificationData: NotificationData): Promise<void> {
    try {
      await supabaseAdmin
        .from('user_notifications')
        .insert(notificationData);
      
      ErrorHandler.logSuccess('Notification created');
    } catch (error) {
      ErrorHandler.logError('Error creating notification', error);
    }
  }

  static async sendBookingNotifications(supabaseAdmin: any, booking: any): Promise<void> {
    const isInstant = booking.spaces.confirmation_type === 'instant';
    
    // Notification for coworker
    await this.createNotification(supabaseAdmin, {
      user_id: booking.user_id,
      type: 'booking',
      title: isInstant ? 'Prenotazione confermata!' : 'Prenotazione in attesa di approvazione',
      content: isInstant 
        ? `La tua prenotazione presso "${booking.spaces.title}" è stata confermata automaticamente. Buon lavoro!`
        : `La tua prenotazione presso "${booking.spaces.title}" è in attesa di approvazione dall'host. Riceverai una notifica appena verrà confermata.`,
      metadata: {
        booking_id: booking.id,
        space_title: booking.spaces.title,
        confirmation_type: booking.spaces.confirmation_type
      }
    });

    // Notification for host
    if (isInstant) {
      await this.createNotification(supabaseAdmin, {
        user_id: booking.spaces.host_id,
        type: 'booking',
        title: 'Nuova prenotazione confermata',
        content: `Hai ricevuto una prenotazione per "${booking.spaces.title}". Il pagamento è stato elaborato con successo.`,
        metadata: {
          booking_id: booking.id,
          space_title: booking.spaces.title,
          payment_received: true
        }
      });
    } else {
      await this.createNotification(supabaseAdmin, {
        user_id: booking.spaces.host_id,
        type: 'booking',
        title: 'Nuova richiesta di prenotazione',
        content: `Hai ricevuto una nuova richiesta di prenotazione per "${booking.spaces.title}". Vai alla dashboard per approvarla.`,
        metadata: {
          booking_id: booking.id,
          space_title: booking.spaces.title,
          action_required: 'approve_booking'
        }
      });
    }
  }

  static async sendRefundNotification(supabaseAdmin: any, userId: string, bookingId: string, refund: any): Promise<void> {
    await this.createNotification(supabaseAdmin, {
      user_id: userId,
      type: 'booking',
      title: 'Rimborso completato',
      content: 'Il rimborso per la prenotazione cancellata è stato elaborato con successo',
      metadata: {
        booking_id: bookingId,
        refund_amount: refund.amount / 100,
        currency: refund.currency
      }
    });
  }
}
