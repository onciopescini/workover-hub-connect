import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminSettings } from "@/hooks/admin/useAdminSettings";
import { Loader2 } from "lucide-react";

const ModerationSettings = () => {
  const { toast } = useToast();
  const { settings, isLoading, updateSetting } = useAdminSettings("moderation");
  
  const [autoModeration, setAutoModeration] = useState(settings?.["enable_auto_moderation"] || false);

  const handleSave = async () => {
    try {
      await updateSetting("enable_auto_moderation", autoModeration);

      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni di moderazione sono state aggiornate",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio",
        variant: "destructive",
      });
    }
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
      <div>
        <h3 className="text-lg font-semibold mb-4">Moderazione Automatica</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_moderation">Abilita Moderazione Automatica</Label>
              <p className="text-sm text-muted-foreground">
                Filtra automaticamente contenuti inappropriati
              </p>
            </div>
            <Switch
              id="auto_moderation"
              checked={autoModeration}
              onCheckedChange={setAutoModeration}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          Salva Impostazioni
        </Button>
      </div>
    </div>
  );
};

export default ModerationSettings;
