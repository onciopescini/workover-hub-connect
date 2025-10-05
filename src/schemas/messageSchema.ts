
import { z } from 'zod';

// Message attachment validation
const MessageAttachmentSchema = z.object({
  url: z.string().url("URL allegato non valido"),
  type: z.enum(['image', 'document', 'video', 'audio'], {
    errorMap: () => ({ message: "Tipo allegato non valido" })
  }),
  name: z.string().max(255, "Nome file troppo lungo"),
  size: z.number().max(10 * 1024 * 1024, "File troppo grande (max 10MB)"),
});

// Message creation
export const MessageFormSchema = z.object({
  content: z.string()
    .min(1, "Il messaggio non può essere vuoto")
    .max(2000, "Il messaggio non può superare i 2000 caratteri")
    .trim(),
  booking_id: z.string().uuid("ID prenotazione non valido").optional(),
  conversation_id: z.string().uuid("ID conversazione non valido").optional(),
  attachments: z.array(MessageAttachmentSchema)
    .max(5, "Massimo 5 allegati per messaggio")
    .optional()
    .default([]),
}).refine(
  (data) => data.booking_id || data.conversation_id,
  {
    message: "Specificare booking_id o conversation_id",
    path: ["booking_id"],
  }
);

// Message update (read status)
export const MessageUpdateSchema = z.object({
  message_id: z.string().uuid("ID messaggio non valido"),
  is_read: z.boolean(),
});

// Bulk message read
export const BulkMessageReadSchema = z.object({
  message_ids: z.array(z.string().uuid()).min(1, "Almeno un messaggio richiesto"),
  is_read: z.boolean().default(true),
});

// Message template (for hosts)
export const MessageTemplateSchema = z.object({
  name: z.string()
    .min(1, "Il nome è obbligatorio")
    .max(100, "Il nome non può superare i 100 caratteri"),
  content: z.string()
    .min(10, "Il contenuto è troppo breve")
    .max(2000, "Il contenuto non può superare i 2000 caratteri"),
  type: z.enum(['confirmation', 'reminder', 'cancellation', 'welcome', 'custom'], {
    errorMap: () => ({ message: "Tipo template non valido" })
  }),
  is_active: z.boolean().default(true),
  is_favorite: z.boolean().default(false),
});

// Private chat creation
export const PrivateChatSchema = z.object({
  participant_id: z.string().uuid("ID partecipante non valido"),
});

// Export types
export type MessageAttachmentData = z.infer<typeof MessageAttachmentSchema>;
export type MessageFormData = z.infer<typeof MessageFormSchema>;
export type MessageUpdateData = z.infer<typeof MessageUpdateSchema>;
export type BulkMessageReadData = z.infer<typeof BulkMessageReadSchema>;
export type MessageTemplateData = z.infer<typeof MessageTemplateSchema>;
export type PrivateChatData = z.infer<typeof PrivateChatSchema>;
