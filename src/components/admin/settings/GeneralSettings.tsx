import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminSettings } from "@/hooks/admin/useAdminSettings";
import { validateSettingValue } from "@/lib/admin/admin-settings-utils";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const GeneralSettings = () => {
  const { settings, isLoading, updateSetting } = useAdminSettings("general");
  
  const [platformName, setPlatformName] = useState(settings?.["platform_name"] || "CoWork Space");
  const [currency, setCurrency] = useState(settings?.["platform_currency"] || "EUR");
  const [timezone, setTimezone] = useState(settings?.["platform_timezone"] || "Europe/Rome");
  const [maintenanceMode, setMaintenanceMode] = useState(settings?.["maintenance_mode"] || false);
  const [enablePrivateMessaging, setEnablePrivateMessaging] = useState(settings?.["enable_private_messaging"] || true);
  const [enableEvents, setEnableEvents] = useState(settings?.["enable_events"] || true);
  const [enableNetworking, setEnableNetworking] = useState(settings?.["enable_networking"] || true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setPlatformName(settings["platform_name"] || "CoWork Space");
      setCurrency(settings["platform_currency"] || "EUR");
      setTimezone(settings["platform_timezone"] || "Europe/Rome");
      setMaintenanceMode(settings["maintenance_mode"] || false);
      setEnablePrivateMessaging(settings["enable_private_messaging"] || true);
      setEnableEvents(settings["enable_events"] || true);
      setEnableNetworking(settings["enable_networking"] || true);
      setHasUnsavedChanges(false);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      // Validate all fields
      if (!platformName.trim()) {
        toast.error("Errore di validazione", { description: "Il nome della piattaforma non può essere vuoto" });
        return;
      }

      await updateSetting("platform_name", platformName);
      await updateSetting("platform_currency", currency);
      await updateSetting("platform_timezone", timezone);
      await updateSetting("maintenance_mode", maintenanceMode);
      await updateSetting("enable_private_messaging", enablePrivateMessaging);
      await updateSetting("enable_events", enableEvents);
      await updateSetting("enable_networking", enableNetworking);

      setHasUnsavedChanges(false);
      toast.success("Impostazioni salvate", { description: "Le impostazioni generali sono state aggiornate con successo" });
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
        <h3 className="text-lg font-semibold mb-4">Informazioni Piattaforma</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform_name">Nome Piattaforma</Label>
            <Input
              id="platform_name"
              value={platformName}
              onChange={(e) => {
                setPlatformName(e.target.value);
                setHasUnsavedChanges(true);
              }}
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

      <div className="flex justify-end items-center gap-3">
        {hasUnsavedChanges && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            Modifiche non salvate
          </Badge>
        )}
        <Button onClick={handleSave}>
          Salva Impostazioni
        </Button>
      </div>
    </div>
  );
};

export default GeneralSettings;
