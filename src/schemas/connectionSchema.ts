
import { z } from 'zod';

// Connection request
export const ConnectionRequestSchema = z.object({
  receiver_id: z.string().uuid("ID destinatario non valido"),
  message: z.string()
    .max(500, "Il messaggio non può superare i 500 caratteri")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Connection response
export const ConnectionResponseSchema = z.object({
  connection_id: z.string().uuid("ID connessione non valido"),
  status: z.enum(['accepted', 'rejected'], {
    errorMap: () => ({ message: "Stato non valido" })
  }),
  response_message: z.string()
    .max(500, "Il messaggio non può superare i 500 caratteri")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Connection removal
export const ConnectionRemovalSchema = z.object({
  connection_id: z.string().uuid("ID connessione non valido"),
  reason: z.string()
    .max(500, "Il motivo non può superare i 500 caratteri")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Profile access check
export const ProfileAccessSchema = z.object({
  profile_id: z.string().uuid("ID profilo non valido"),
});

// Connection suggestion feedback
export const SuggestionFeedbackSchema = z.object({
  suggestion_id: z.string().uuid("ID suggerimento non valido"),
  action: z.enum(['connect', 'dismiss', 'hide'], {
    errorMap: () => ({ message: "Azione non valida" })
  }),
});

// Networking preferences update
export const NetworkingPreferencesSchema = z.object({
  networking_enabled: z.boolean(),
  collaboration_availability: z.enum(['available', 'maybe', 'not_available'], {
    errorMap: () => ({ message: "Disponibilità non valida" })
  }).default('not_available'),
  collaboration_types: z.array(z.enum([
    'progetti',
    'consulenza',
    'partnership',
    'mentorship',
    'eventi',
    'altro'
  ])).default([]),
  preferred_work_mode: z.enum(['remoto', 'ibrido', 'presenza', 'flessibile'], {
    errorMap: () => ({ message: "Modalità non valida" })
  }).default('flessibile'),
  collaboration_description: z.string()
    .max(500, "La descrizione non può superare i 500 caratteri")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Export types
export type ConnectionRequestData = z.infer<typeof ConnectionRequestSchema>;
export type ConnectionResponseData = z.infer<typeof ConnectionResponseSchema>;
export type ConnectionRemovalData = z.infer<typeof ConnectionRemovalSchema>;
export type ProfileAccessData = z.infer<typeof ProfileAccessSchema>;
export type SuggestionFeedbackData = z.infer<typeof SuggestionFeedbackSchema>;
export type NetworkingPreferencesData = z.infer<typeof NetworkingPreferencesSchema>;
