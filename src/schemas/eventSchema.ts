
import { z } from 'zod';

// Event creation
export const EventFormSchema = z.object({
  title: z.string()
    .min(5, "Il titolo è troppo breve (minimo 5 caratteri)")
    .max(100, "Il titolo non può superare i 100 caratteri"),
  description: z.string()
    .min(20, "La descrizione è troppo breve (minimo 20 caratteri)")
    .max(2000, "La descrizione non può superare i 2000 caratteri"),
  space_id: z.string().uuid("ID spazio non valido"),
  date: z.string()
    .datetime("Data/ora non valida (formato ISO 8601 richiesto)"),
  max_participants: z.number()
    .min(2, "Minimo 2 partecipanti")
    .max(1000, "Massimo 1000 partecipanti")
    .default(10),
  city: z.string()
    .max(100, "Nome città troppo lungo")
    .optional()
    .transform(val => val?.trim() || undefined),
  image_url: z.string()
    .url("URL immagine non valido")
    .optional()
    .or(z.literal("")),
  status: z.enum(['active', 'cancelled', 'completed'], {
    errorMap: () => ({ message: "Stato evento non valido" })
  }).default('active'),
}).refine(
  (data) => {
    // Data evento deve essere nel futuro
    const eventDate = new Date(data.date);
    const now = new Date();
    return eventDate > now;
  },
  {
    message: "La data dell'evento deve essere nel futuro",
    path: ["date"],
  }
);

// Event update
export const EventUpdateSchema = z.object({
  event_id: z.string().uuid("ID evento non valido"),
  title: z.string()
    .min(5, "Titolo troppo breve")
    .max(100, "Titolo troppo lungo")
    .optional(),
  description: z.string()
    .min(20, "Descrizione troppo breve")
    .max(2000, "Descrizione troppo lunga")
    .optional(),
  date: z.string()
    .datetime("Data/ora non valida")
    .optional(),
  max_participants: z.number()
    .min(2)
    .max(1000)
    .optional(),
  city: z.string()
    .max(100)
    .optional()
    .transform(val => val?.trim() || undefined),
  image_url: z.string()
    .url("URL immagine non valido")
    .optional()
    .or(z.literal("")),
  status: z.enum(['active', 'cancelled', 'completed'], {
    errorMap: () => ({ message: "Stato non valido" })
  }).optional(),
});

// Event participation
export const EventParticipationSchema = z.object({
  event_id: z.string().uuid("ID evento non valido"),
});

// Event cancellation
export const EventCancellationSchema = z.object({
  event_id: z.string().uuid("ID evento non valido"),
  cancellation_reason: z.string()
    .min(10, "Motivo cancellazione troppo breve")
    .max(500, "Motivo cancellazione troppo lungo"),
  notify_participants: z.boolean().default(true),
});

// Waitlist join
export const WaitlistJoinSchema = z.object({
  event_id: z.string().uuid("ID evento non valido"),
  notification_preference: z.enum(['email', 'push', 'both', 'none'], {
    errorMap: () => ({ message: "Preferenza notifica non valida" })
  }).default('email'),
});

// Event leave (participant or waitlist)
export const EventLeaveSchema = z.object({
  event_id: z.string().uuid("ID evento non valido"),
  leave_reason: z.string()
    .max(500, "Motivo troppo lungo")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Event filter/search
export const EventFilterSchema = z.object({
  city: z.string().max(100).optional(),
  date_from: z.string().datetime("Data inizio non valida").optional(),
  date_to: z.string().datetime("Data fine non valida").optional(),
  status: z.enum(['active', 'cancelled', 'completed']).optional(),
  space_id: z.string().uuid().optional(),
  created_by: z.string().uuid().optional(),
  has_availability: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Event statistics
export const EventStatsQuerySchema = z.object({
  event_id: z.string().uuid("ID evento non valido"),
  include_participants: z.boolean().default(false),
  include_waitlist: z.boolean().default(false),
});

// Export types
export type EventFormData = z.infer<typeof EventFormSchema>;
export type EventUpdateData = z.infer<typeof EventUpdateSchema>;
export type EventParticipationData = z.infer<typeof EventParticipationSchema>;
export type EventCancellationData = z.infer<typeof EventCancellationSchema>;
export type WaitlistJoinData = z.infer<typeof WaitlistJoinSchema>;
export type EventLeaveData = z.infer<typeof EventLeaveSchema>;
export type EventFilterData = z.infer<typeof EventFilterSchema>;
export type EventStatsQueryData = z.infer<typeof EventStatsQuerySchema>;
