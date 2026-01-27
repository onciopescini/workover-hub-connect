
import { z } from 'zod';

// ============= CONSTANTS =============

/** Maximum number of days in advance a booking can be made */
export const MAX_BOOKING_DAYS_AHEAD = 365;

// Time slot validation
const TimeSlotSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato orario non valido"),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato orario non valido"),
});

// Single booking slot (for multi-day bookings)
export const BookingSlotSchema = z.object({
  id: z.string().uuid("ID non valido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido (YYYY-MM-DD)"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato orario non valido"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato orario non valido"),
  hasConflict: z.boolean().optional(),
  conflictMessage: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

// Multi-day booking data
export const MultiDayBookingSchema = z.object({
  slots: z.array(BookingSlotSchema).min(1, "Almeno uno slot richiesto"),
  totalPrice: z.number().min(0, "Il prezzo deve essere >= 0"),
  totalHours: z.number().min(0.5, "Minimo 0.5 ore richieste"),
});

// Booking creation/update
export const BookingFormSchema = z.object({
  space_id: z.string().uuid("ID spazio non valido"),
  booking_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido")
    .refine(val => {
      const bookingDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return bookingDate >= today;
    }, 'La data deve essere futura')
    .refine(val => {
      const bookingDate = new Date(val);
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS_AHEAD);
      return bookingDate <= maxDate;
    }, `Prenotazione massima ${MAX_BOOKING_DAYS_AHEAD} giorni in anticipo`),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Orario inizio non valido").optional(),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Orario fine non valido").optional(),
  guests_count: z.number().min(1, "Almeno 1 ospite richiesto").max(100, "Massimo 100 ospiti"),
}).refine(
  (data) => {
    if (data.start_time && data.end_time) {
      return data.start_time < data.end_time;
    }
    return true;
  },
  {
    message: "L'orario di fine deve essere successivo all'orario di inizio",
    path: ["end_time"],
  }
);

// Booking cancellation
export const BookingCancellationSchema = z.object({
  booking_id: z.string().uuid("ID prenotazione non valido"),
  cancelled_by_host: z.boolean().default(false),
  cancellation_reason: z.string()
    .min(10, "Motivo cancellazione troppo breve (minimo 10 caratteri)")
    .max(500, "Motivo cancellazione troppo lungo (massimo 500 caratteri)")
    .optional(),
});

// Slot reservation
export const SlotReservationSchema = z.object({
  space_id: z.string().uuid("ID spazio non valido"),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido"),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Orario non valido"),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Orario non valido"),
  guests_count: z.number().min(1).max(100).default(1),
});

// Booking status update
export const BookingStatusUpdateSchema = z.object({
  booking_id: z.string().uuid("ID prenotazione non valido"),
  status: z.enum(['pending', 'confirmed', 'cancelled'], {
    errorMap: () => ({ message: "Stato non valido" })
  }),
});

// Export types
export type BookingSlotData = z.infer<typeof BookingSlotSchema>;
export type MultiDayBookingData = z.infer<typeof MultiDayBookingSchema>;
export type BookingFormData = z.infer<typeof BookingFormSchema>;
export type BookingCancellationData = z.infer<typeof BookingCancellationSchema>;
export type SlotReservationData = z.infer<typeof SlotReservationSchema>;
export type BookingStatusUpdateData = z.infer<typeof BookingStatusUpdateSchema>;
