
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DataRectificationRequestProps {
  onRequestSubmitted?: () => void;
}

export const DataRectificationRequest = ({ onRequestSubmitted }: DataRectificationRequestProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestData, setRequestData] = useState({
    data_field: "",
    current_value: "",
    requested_value: "",
    reason: ""
  });

  const dataFields = [
    { value: "first_name", label: "Nome" },
    { value: "last_name", label: "Cognome" },
    { value: "bio", label: "Biografia" },
    { value: "job_title", label: "Titolo di lavoro" },
    { value: "location", label: "Posizione" },
    { value: "linkedin_url", label: "URL LinkedIn" },
    { value: "website", label: "Sito Web" },
    { value: "skills", label: "Competenze" },
    { value: "interests", label: "Interessi" }
  ];

  const handleSubmitRequest = async () => {
    if (!requestData.data_field || !requestData.reason) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error("Not authenticated");

      const requestNotes = `
Campo dati: ${dataFields.find(f => f.value === requestData.data_field)?.label}
Valore attuale: ${requestData.current_value || 'Non specificato'}
Valore richiesto: ${requestData.requested_value}
Motivo: ${requestData.reason}
      `.trim();

      const { error } = await supabase
        .from('gdpr_requests')
        .insert({
          user_id: currentUser.user.id,
          request_type: 'data_rectification',
          notes: requestNotes
        });

      if (error) throw error;

      toast.success("Richiesta di rettifica dati inviata con successo");
      setIsDialogOpen(false);
      setRequestData({
        data_field: "",
        current_value: "",
        requested_value: "",
        reason: ""
      });
      onRequestSubmitted?.();
    } catch (error) {
      console.error("Error submitting rectification request:", error);
      toast.error("Errore nell'invio della richiesta");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Rettifica Dati (Art. 16 GDPR)
        </CardTitle>
        <CardDescription>
          Richiedi la correzione di dati personali inesatti o incompleti
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Edit3 className="h-4 w-4 mr-2" />
              Richiedi Rettifica Dati
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Richiesta Rettifica Dati</DialogTitle>
              <DialogDescription>
                Compila il modulo per richiedere la correzione dei tuoi dati personali
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="data_field">Campo da correggere *</Label>
                <Select value={requestData.data_field} onValueChange={(value) => 
                  setRequestData({ ...requestData, data_field: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona il campo da correggere" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataFields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="current_value">Valore attuale</Label>
                <Input
                  id="current_value"
                  value={requestData.current_value}
                  onChange={(e) => setRequestData({ ...requestData, current_value: e.target.value })}
                  placeholder="Valore attualmente memorizzato (se noto)"
                />
              </div>
              
              <div>
                <Label htmlFor="requested_value">Valore corretto *</Label>
                <Input
                  id="requested_value"
                  value={requestData.requested_value}
                  onChange={(e) => setRequestData({ ...requestData, requested_value: e.target.value })}
                  placeholder="Il valore corretto che dovrebbe essere memorizzato"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="reason">Motivo della rettifica *</Label>
                <Textarea
                  id="reason"
                  value={requestData.reason}
                  onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                  placeholder="Spiega perché è necessaria questa correzione"
                  rows={3}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? "Invio..." : "Invia Richiesta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <p className="text-sm text-gray-600 mt-4">
          Le richieste di rettifica verranno elaborate entro 30 giorni dalla ricezione.
          Riceverai una notifica quando la tua richiesta sarà stata esaminata.
        </p>
      </CardContent>
    </Card>
  );
};
