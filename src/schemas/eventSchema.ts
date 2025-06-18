
import { z } from 'zod';

export const EventFormSchema = z.object({
  title: z.string().min(1, "Il titolo è obbligatorio").max(100, "Il titolo non può superare i 100 caratteri"),
  description: z.string().optional(),
  space_id: z.string().min(1, "Seleziona uno spazio"),
  date: z.string().min(1, "La data è obbligatoria"),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato orario non valido"),
  max_participants: z.number().min(1, "Almeno 1 partecipante").max(100, "Massimo 100 partecipanti"),
  image_url: z.string().url("URL immagine non valido").optional().or(z.literal("")),
  city: z.string().optional(),
});

export type EventFormData = z.infer<typeof EventFormSchema>;
