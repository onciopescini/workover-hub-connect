import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Edit, Plus } from "lucide-react";
import EmailTemplateEditor from "./EmailTemplateEditor";

const EmailTemplatesManager = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_key");
      
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsEditorOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Email Templates</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gestisci i template email per notifiche automatiche
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Template
        </Button>
      </div>

      <div className="space-y-3">
        {templates?.map((template) => (
          <div
            key={template.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">{template.template_key}</h4>
                  {template.is_active ? (
                    <Badge variant="default" className="text-xs">Attivo</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Disattivo</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Oggetto: {template.subject}
                </p>
                {Array.isArray(template.variables) && template.variables.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <span className="text-xs text-muted-foreground">Variabili:</span>
                    {(template.variables as string[]).map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(template)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <EmailTemplateEditor
        template={selectedTemplate}
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
      />
    </div>
  );
};

export default EmailTemplatesManager;
