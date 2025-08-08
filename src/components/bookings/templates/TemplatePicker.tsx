
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TemplateType = "confirmation" | "reminder" | "cancellation_notice";

interface Template {
  id: string;
  host_id: string;
  name: string;
  type: TemplateType;
  content: string;
  is_favorite: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplatePickerProps {
  typeFilter?: TemplateType | "all";
  onPick: (content: string) => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ typeFilter = "all", onPick }) => {
  const { authState } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return templates;
    return templates.filter((t) => t.type === typeFilter);
  }, [templates, typeFilter]);

  useEffect(() => {
    const load = async () => {
      if (!authState.user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("host_id", authState.user.id)
        .eq("is_active", true)
        .order("is_favorite", { ascending: false })
        .order("updated_at", { ascending: false });

      if (!error && data) setTemplates(data as Template[]);
      setLoading(false);
    };
    load();
  }, [authState.user?.id]);

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-sm font-medium mb-2">Template disponibili</div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Caricamento...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nessun template attivo.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-2 border rounded-md">
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{t.type.replace(/_/g, " ")}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onPick(t.content)}>
                  Usa
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-3">
          Suggerimento: personalizza il testo dopo aver scelto un template.
        </div>
      </CardContent>
    </Card>
  );
};

export default TemplatePicker;
