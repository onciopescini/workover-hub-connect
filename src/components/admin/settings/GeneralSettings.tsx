import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAdminSettings } from "@/hooks/admin/useAdminSettings";
import { Loader2 } from "lucide-react";

const GeneralSettings = () => {
  const { toast } = useToast();
  const { settings, isLoading, updateSetting } = useAdminSettings("general");
  
  const [platformName, setPlatformName] = useState(settings?.["platform_name"] || "CoWork Space");
  const [currency, setCurrency] = useState(settings?.["platform_currency"] || "EUR");
  const [timezone, setTimezone] = useState(settings?.["platform_timezone"] || "Europe/Rome");
  const [maintenanceMode, setMaintenanceMode] = useState(settings?.["maintenance_mode"] || false);
  const [enablePrivateMessaging, setEnablePrivateMessaging] = useState(settings?.["enable_private_messaging"] || true);
  const [enableEvents, setEnableEvents] = useState(settings?.["enable_events"] || true);
  const [enableNetworking, setEnableNetworking] = useState(settings?.["enable_networking"] || true);

  const handleSave = async () => {
    try {
      await updateSetting("platform_name", platformName);
      await updateSetting("platform_currency", currency);
      await updateSetting("platform_timezone", timezone);
      await updateSetting("maintenance_mode", maintenanceMode);
      await updateSetting("enable_private_messaging", enablePrivateMessaging);
      await updateSetting("enable_events", enableEvents);
      await updateSetting("enable_networking", enableNetworking);

      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni generali sono state aggiornate con successo",
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
        <h3 className="text-lg font-semibold mb-4">Informazioni Piattaforma</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform_name">Nome Piattaforma</Label>
            <Input
              id="platform_name"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Valuta</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="EUR"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Europe/Rome"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Feature Flags</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="private_messaging">Messaggistica Privata</Label>
              <p className="text-sm text-muted-foreground">
                Abilita chat private tra utenti
              </p>
            </div>
            <Switch
              id="private_messaging"
              checked={enablePrivateMessaging}
              onCheckedChange={setEnablePrivateMessaging}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="events">Eventi</Label>
              <p className="text-sm text-muted-foreground">
                Abilita creazione e partecipazione eventi
              </p>
            </div>
            <Switch
              id="events"
              checked={enableEvents}
              onCheckedChange={setEnableEvents}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="networking">Networking</Label>
              <p className="text-sm text-muted-foreground">
                Abilita connessioni e networking tra utenti
              </p>
            </div>
            <Switch
              id="networking"
              checked={enableNetworking}
              onCheckedChange={setEnableNetworking}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenance" className="text-destructive">
                Modalità Manutenzione
              </Label>
              <p className="text-sm text-muted-foreground">
                Disabilita l'accesso per tutti gli utenti non admin
              </p>
            </div>
            <Switch
              id="maintenance"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
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

export default GeneralSettings;
