import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

export const supportTicketSchema = z.object({
  subject: z.string()
    .trim()
    .min(5, 'Oggetto troppo corto (min 5 caratteri)')
    .max(200, 'Oggetto troppo lungo (max 200 caratteri)')
    .transform(str => DOMPurify.sanitize(str)),
  
  message: z.string()
    .trim()
    .min(20, 'Messaggio troppo corto (min 20 caratteri)')
    .max(5000, 'Messaggio troppo lungo (max 5000 caratteri)')
    .transform(str => DOMPurify.sanitize(str)),
  
  category: z.enum([
    'technical', 'booking', 'payment', 'account', 
    'space', 'feedback', 'other'
  ], { 
    errorMap: () => ({ message: 'Categoria non valida' }) 
  }),
  
  priority: z.enum(['low', 'normal', 'high', 'critical'])
    .default('normal')
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
