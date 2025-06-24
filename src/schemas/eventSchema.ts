
import { z } from 'zod';

export const EventFormSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio'),
  description: z.string().optional(),
  space_id: z.string().min(1, 'Seleziona uno spazio'),
  date: z.string().min(1, 'La data è obbligatoria'),
  time: z.string().min(1, 'L\'orario è obbligatorio'),
  max_participants: z.number().min(1, 'Almeno 1 partecipante').max(100, 'Massimo 100 partecipanti'),
  image_url: z.string().optional(),
  city: z.string().optional()
});

export type EventFormData = z.infer<typeof EventFormSchema>;
