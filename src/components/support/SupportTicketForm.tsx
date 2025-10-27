
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupportTicket, checkClientRateLimit } from "@/lib/support-utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLogger } from "@/hooks/useLogger";
import { supportTicketSchema, type SupportTicketInput } from '@/schemas/supportTicketSchema';
import { Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

type SupportTicketFormData = SupportTicketInput;

interface SupportTicketFormProps {
  onSuccess?: () => void;
}

const TICKET_CATEGORIES = [
  { value: 'technical', label: 'Problema tecnico' },
  { value: 'booking', label: 'Problema con prenotazione' },
  { value: 'payment', label: 'Problema di pagamento' },
  { value: 'account', label: 'Problema con account' },
  { value: 'space', label: 'Problema con spazio' },
  { value: 'feedback', label: 'Feedback/Suggerimenti' },
  { value: 'other', label: 'Altro' }
];

const TICKET_PRIORITIES = [
  { value: 'low', label: 'Bassa' },
  { value: 'normal', label: 'Normale' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Critica' }
];

export function SupportTicketForm({ onSuccess }: SupportTicketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const { info, error } = useLogger({ context: 'SupportTicketForm' });
  
  const form = useForm<SupportTicketFormData>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues: {
      subject: '',
      message: '',
      category: 'technical',
      priority: 'normal'
    }
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const onSubmit = async (data: SupportTicketFormData) => {
    // Check rate limit before submitting
    const rateLimitCheck = checkClientRateLimit();
    if (!rateLimitCheck.allowed && rateLimitCheck.waitTime) {
      const minutes = Math.ceil(rateLimitCheck.waitTime / 60);
      setRateLimitError(`Hai inviato troppi ticket. Riprova tra ${minutes} minuti.`);
      return;
    }
    
    setRateLimitError(null);
    setIsSubmitting(true);
    
    try {
      const ticketResult = await createSupportTicket(data);

      if (ticketResult.success) {
        form.reset();
        info('Support ticket created successfully', { 
          subject: data.subject, 
          category: data.category,
          ticket_id: ticketResult.ticket_id
        });
        onSuccess?.();
      }
    } catch (ticketError) {
      error("Error creating ticket", ticketError as Error, { subject: data.subject, category: data.category });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuovo Ticket di Supporto</CardTitle>
      </CardHeader>
      <CardContent>
        {!isOnline && (
          <Alert className="mb-4 border-red-500">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Nessuna connessione internet. Verifica la tua connessione prima di inviare il ticket.
            </AlertDescription>
          </Alert>
        )}
        
        {rateLimitError && (
          <Alert className="mb-4 border-amber-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{rateLimitError}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                rules={{ required: "Seleziona una categoria" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona categoria..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TICKET_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                rules={{ required: "Seleziona una priorità" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorità *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona priorità..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TICKET_PRIORITIES.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              rules={{ 
                required: "L'oggetto è obbligatorio",
                minLength: { value: 5, message: "L'oggetto deve essere di almeno 5 caratteri" },
                maxLength: { value: 200, message: "L'oggetto non può superare i 200 caratteri" }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oggetto *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Descrivi brevemente il problema..."
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">{field.value.length}/200 caratteri</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              rules={{ 
                required: "Il messaggio è obbligatorio",
                minLength: { value: 20, message: "Il messaggio deve essere di almeno 20 caratteri" },
                maxLength: { value: 5000, message: "Il messaggio non può superare i 5000 caratteri" }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaggio *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrivi dettagliatamente il problema..."
                      rows={5}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-gray-500">{field.value.length}/5000 caratteri</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || !isOnline || !!rateLimitError}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                "Invia Ticket"
              )}
            </Button>
            
            {isSubmitting && (
              <p className="text-xs text-center text-gray-500">
                Non chiudere questa finestra durante l'invio...
              </p>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
