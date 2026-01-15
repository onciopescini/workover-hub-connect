import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminSettings } from "@/hooks/admin/useAdminSettings";
import { Loader2 } from "lucide-react";

const GDPRSettings = () => {
  const { settings, isLoading, updateSetting } = useAdminSettings("gdpr");
  
  const [dataRetention, setDataRetention] = useState(settings?.["data_retention_months"] || 24);
  const [cookieConsent, setCookieConsent] = useState(settings?.["cookie_consent_required"] || true);

  const handleSave = async () => {
    try {
      await updateSetting("data_retention_months", Number(dataRetention));
      await updateSetting("cookie_consent_required", cookieConsent);

      toast.success("Impostazioni salvate", { description: "Le impostazioni GDPR sono state aggiornate" });
    } catch (error) {
      toast.error("Errore", { description: "Si è verificato un errore durante il salvataggio" });
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
        <h3 className="text-lg font-semibold mb-4">Data Retention</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_retention">Periodo Conservazione Dati (mesi)</Label>
            <Input
              id="data_retention"
              type="number"
              min="6"
              max="120"
              value={dataRetention}
              onChange={(e) => setDataRetention(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Durata conservazione dati utenti inattivi (GDPR compliance)
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Cookie & Privacy</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cookie_consent">Richiedi Consenso Cookie</Label>
              <p className="text-sm text-muted-foreground">
                Mostra banner consenso cookie agli utenti
              </p>
            </div>
            <Switch
              id="cookie_consent"
              checked={cookieConsent}
              onCheckedChange={setCookieConsent}
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

export default GDPRSettings;
