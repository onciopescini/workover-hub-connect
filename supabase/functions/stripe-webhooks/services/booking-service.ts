
import { ErrorHandler } from "../utils/error-handler.ts";
import type { BookingDetails } from "../types/domain-types.ts";

export class BookingService {
  static async getBookingDetails(supabaseAdmin: any, bookingId: string): Promise<BookingDetails | null> {
    try {
      const { data: booking, error } = await supabaseAdmin
        .from('bookings')
        .select(`
          id,
          status,
          space_id,
          user_id,
          spaces!inner (
            id,
            confirmation_type,
            host_id,
            title:name
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) {
        ErrorHandler.logError('Error fetching booking details', error);
        return null;
      }

      return booking;
    } catch (error) {
      ErrorHandler.logError('Booking service error', error);
      return null;
    }
  }

  static async updateBookingStatus(supabaseAdmin: any, bookingId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) {
        ErrorHandler.logError('Error updating booking status', error);
        return false;
      }

      ErrorHandler.logSuccess(`Booking ${status} successfully`);
      return true;
    } catch (error) {
      ErrorHandler.logError('Error updating booking', error);
      return false;
    }
  }

  static determineBookingStatus(confirmationType: string): { status: string; title: string; content: string } {
    if (confirmationType === 'instant') {
      return {
        status: 'confirmed',
        title: 'Prenotazione confermata!',
        content: 'La tua prenotazione è stata confermata automaticamente. Buon lavoro!'
      };
    } else {
      return {
        status: 'pending',
        title: 'Prenotazione in attesa di approvazione',
        content: 'La tua prenotazione è in attesa di approvazione dall\'host. Riceverai una notifica appena verrà confermata.'
      };
    }
  }
}
