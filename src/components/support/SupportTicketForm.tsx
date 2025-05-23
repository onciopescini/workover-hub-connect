
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupportTicket } from "@/lib/support-utils";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface SupportTicketFormData {
  subject: string;
  message: string;
  category: string;
}

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

export function SupportTicketForm({ onSuccess }: SupportTicketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<SupportTicketFormData>({
    defaultValues: {
      subject: '',
      message: '',
      category: ''
    }
  });

  const onSubmit = async (data: SupportTicketFormData) => {
    setIsSubmitting(true);
    
    try {
      const success = await createSupportTicket({
        subject: data.subject,
        message: data.message,
        status: 'open'
      });

      if (success) {
        form.reset();
        toast.success("Ticket creato con successo! Ti risponderemo presto.");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("Errore nella creazione del ticket. Riprova.");
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              rules={{ required: "Seleziona una categoria" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              name="subject"
              rules={{ 
                required: "L'oggetto è obbligatorio",
                minLength: { value: 5, message: "L'oggetto deve essere di almeno 5 caratteri" }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oggetto</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Descrivi brevemente il problema..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              rules={{ 
                required: "Il messaggio è obbligatorio",
                minLength: { value: 20, message: "Il messaggio deve essere di almeno 20 caratteri" }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaggio</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrivi dettagliatamente il problema..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Invio in corso..." : "Invia Ticket"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
