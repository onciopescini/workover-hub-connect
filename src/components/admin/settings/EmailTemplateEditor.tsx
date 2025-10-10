import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface EmailTemplateEditorProps {
  template: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_VARIABLES = [
  "user_name", "space_title", "booking_date", "start_time", "end_time",
  "host_name", "amount", "guests_count"
];

const EmailTemplateEditor = ({ template, open, onOpenChange }: EmailTemplateEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [templateKey, setTemplateKey] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (template) {
      setTemplateKey(template.template_key);
      setSubject(template.subject);
      setBody(template.body);
      setIsActive(template.is_active);
    } else {
      setTemplateKey("");
      setSubject("");
      setBody("");
      setIsActive(true);
    }
  }, [template]);

  const insertVariable = (variable: string) => {
    setBody(body + `{{${variable}}}`);
  };

  const handleSave = async () => {
    try {
      const templateData = {
        template_key: templateKey,
        subject,
        body,
        is_active: isActive,
        variables: AVAILABLE_VARIABLES,
      };

      if (template) {
        const { error } = await supabase
          .from("email_templates")
          .update(templateData)
          .eq("id", template.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_templates")
          .insert(templateData);
        
        if (error) throw error;
      }

      toast({
        title: "Template salvato",
        description: "Il template email è stato salvato con successo",
      });

      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Modifica Template Email" : "Nuovo Template Email"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template_key">Chiave Template</Label>
            <Input
              id="template_key"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              placeholder="booking_confirmation"
              disabled={!!template}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Oggetto Email</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Prenotazione Confermata"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Corpo Email</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Ciao {{user_name}},&#10;&#10;La tua prenotazione è stata confermata..."
            />
          </div>

          <div className="space-y-2">
            <Label>Variabili Disponibili</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map((variable) => (
                <Badge
                  key={variable}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => insertVariable(variable)}
                >
                  {`{{${variable}}}`}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Clicca su una variabile per inserirla nel corpo del messaggio
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Template Attivo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave}>
            Salva Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailTemplateEditor;
