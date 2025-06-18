
import { z } from 'zod';

export const ReportFormSchema = z.object({
  reason: z.string().min(1, "Seleziona un motivo"),
  description: z.string()
    .max(500, "La descrizione non può superare i 500 caratteri")
    .optional()
    .transform(val => val?.trim() || undefined),
});

export type ReportFormData = z.infer<typeof ReportFormSchema>;
