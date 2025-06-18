
import { z } from 'zod';

export const ReviewFormSchema = z.object({
  rating: z.number().min(1, "Seleziona una valutazione").max(5, "La valutazione massima è 5"),
  content: z.string()
    .max(500, "Il commento non può superare i 500 caratteri")
    .optional()
    .transform(val => val?.trim() || undefined),
});

export type ReviewFormData = z.infer<typeof ReviewFormSchema>;
