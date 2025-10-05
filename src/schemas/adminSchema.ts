
import { z } from 'zod';

// Report review
export const ReportReviewSchema = z.object({
  report_id: z.string().uuid("ID segnalazione non valido"),
  new_status: z.enum(['open', 'under_review', 'resolved', 'dismissed'], {
    errorMap: () => ({ message: "Stato segnalazione non valido" })
  }),
  admin_notes: z.string()
    .max(1000, "Note admin troppo lunghe (max 1000 caratteri)")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// User suspension
export const UserSuspensionSchema = z.object({
  target_user_id: z.string().uuid("ID utente non valido"),
  suspension_reason: z.string()
    .min(10, "Motivo sospensione troppo breve (minimo 10 caratteri)")
    .max(500, "Motivo sospensione troppo lungo (massimo 500 caratteri)"),
  duration_days: z.number()
    .min(1, "Durata minima: 1 giorno")
    .max(365, "Durata massima: 365 giorni")
    .optional(),
  permanent: z.boolean().default(false),
  notify_user: z.boolean().default(true),
});

// User reactivation
export const UserReactivationSchema = z.object({
  target_user_id: z.string().uuid("ID utente non valido"),
  reactivation_notes: z.string()
    .max(500, "Note troppo lunghe (max 500 caratteri)")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Space suspension
export const SpaceSuspensionSchema = z.object({
  space_id: z.string().uuid("ID spazio non valido"),
  suspension_reason: z.string()
    .min(10, "Motivo sospensione troppo breve (minimo 10 caratteri)")
    .max(500, "Motivo sospensione troppo lungo (massimo 500 caratteri)"),
  cancel_bookings: z.boolean().default(true),
  notify_host: z.boolean().default(true),
  notify_guests: z.boolean().default(true),
});

// Space moderation (approve/reject)
export const SpaceModerationSchema = z.object({
  space_id: z.string().uuid("ID spazio non valido"),
  approve: z.boolean(),
  rejection_reason: z.string()
    .min(10, "Motivo rifiuto troppo breve")
    .max(500, "Motivo rifiuto troppo lungo")
    .optional(),
  admin_notes: z.string()
    .max(1000, "Note troppo lunghe")
    .optional()
    .transform(val => val?.trim() || undefined),
}).refine(
  (data) => {
    // Se rifiutato, deve esserci un motivo
    if (!data.approve && !data.rejection_reason) {
      return false;
    }
    return true;
  },
  {
    message: "Motivo rifiuto obbligatorio quando si rifiuta uno spazio",
    path: ["rejection_reason"],
  }
);

// Space revision review
export const SpaceRevisionReviewSchema = z.object({
  space_id: z.string().uuid("ID spazio non valido"),
  approved: z.boolean(),
  admin_notes: z.string()
    .max(1000, "Note troppo lunghe")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Tag approval
export const TagApprovalSchema = z.object({
  tag_id: z.string().uuid("ID tag non valido"),
  approved: z.boolean(),
  rejection_reason: z.string()
    .max(500, "Motivo rifiuto troppo lungo")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// GDPR request processing
export const GDPRRequestProcessingSchema = z.object({
  request_id: z.string().uuid("ID richiesta non valido"),
  approved: z.boolean(),
  admin_notes: z.string()
    .max(1000, "Note troppo lunghe")
    .optional()
    .transform(val => val?.trim() || undefined),
  corrections_applied: z.record(z.any()).optional(), // JSONB field
});

// Data breach detection
export const DataBreachDetectionSchema = z.object({
  breach_nature: z.string()
    .min(20, "Descrizione breach troppo breve")
    .max(1000, "Descrizione breach troppo lunga"),
  affected_count: z.number()
    .min(0, "Numero utenti affetti deve essere >= 0")
    .default(0),
  affected_data_types: z.array(z.enum([
    'email',
    'password',
    'personal_info',
    'payment_info',
    'location',
    'other'
  ])).default([]),
  breach_severity: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: "Severità non valida" })
  }).default('medium'),
});

// Admin warning
export const AdminWarningSchema = z.object({
  user_id: z.string().uuid("ID utente non valido"),
  warning_type: z.enum(['policy_violation', 'spam', 'inappropriate_content', 'other'], {
    errorMap: () => ({ message: "Tipo warning non valido" })
  }),
  severity: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: "Severità non valida" })
  }).default('medium'),
  title: z.string()
    .min(5, "Titolo troppo breve")
    .max(100, "Titolo troppo lungo"),
  message: z.string()
    .min(10, "Messaggio troppo breve")
    .max(500, "Messaggio troppo lungo"),
});

// Admin action log query
export const AdminActionLogQuerySchema = z.object({
  admin_id: z.string().uuid("ID admin non valido").optional(),
  action_type: z.string().max(50).optional(),
  target_type: z.string().max(50).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido").optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido").optional(),
  limit: z.number().min(1).max(1000).default(100),
});

// Export types
export type ReportReviewData = z.infer<typeof ReportReviewSchema>;
export type UserSuspensionData = z.infer<typeof UserSuspensionSchema>;
export type UserReactivationData = z.infer<typeof UserReactivationSchema>;
export type SpaceSuspensionData = z.infer<typeof SpaceSuspensionSchema>;
export type SpaceModerationData = z.infer<typeof SpaceModerationSchema>;
export type SpaceRevisionReviewData = z.infer<typeof SpaceRevisionReviewSchema>;
export type TagApprovalData = z.infer<typeof TagApprovalSchema>;
export type GDPRRequestProcessingData = z.infer<typeof GDPRRequestProcessingSchema>;
export type DataBreachDetectionData = z.infer<typeof DataBreachDetectionSchema>;
export type AdminWarningData = z.infer<typeof AdminWarningSchema>;
export type AdminActionLogQueryData = z.infer<typeof AdminActionLogQuerySchema>;
