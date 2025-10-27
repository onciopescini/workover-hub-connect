import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminSettings } from "@/hooks/admin/useAdminSettings";
import { validateSettingValue } from "@/lib/admin/admin-settings-utils";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const PaymentConfiguration = () => {
  const { toast } = useToast();
  const { settings, isLoading, updateSetting } = useAdminSettings("payment");
  
  const [platformFee, setPlatformFee] = useState(settings?.["platform_fee_percentage"] || 5);
  const [stripeFee, setStripeFee] = useState(settings?.["stripe_fee_percentage"] || 1.5);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setPlatformFee(settings["platform_fee_percentage"] || 5);
      setStripeFee(settings["stripe_fee_percentage"] || 1.5);
      setHasUnsavedChanges(false);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      // Validate platform fee
      if (!validateSettingValue("platform_fee_percentage", Number(platformFee))) {
        toast({
          title: "Errore di validazione",
          description: "La commissione piattaforma deve essere tra 0 e 100%",
          variant: "destructive",
        });
        return;
      }

      // Validate stripe fee
      if (!validateSettingValue("stripe_fee_percentage", Number(stripeFee))) {
        toast({
          title: "Errore di validazione",
          description: "La commissione Stripe deve essere tra 0 e 100%",
          variant: "destructive",
        });
        return;
      }

      await updateSetting("platform_fee_percentage", Number(platformFee));
      await updateSetting("stripe_fee_percentage", Number(stripeFee));

      setHasUnsavedChanges(false);
      toast({
        title: "Impostazioni salvate",
        description: "Le configurazioni di pagamento sono state aggiornate",
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
        <h3 className="text-lg font-semibold mb-4">Commissioni</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform_fee">Commissione Piattaforma (%)</Label>
            <Input
              id="platform_fee"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={platformFee}
              onChange={(e) => {
                setPlatformFee(e.target.value);
                setHasUnsavedChanges(true);
              }}
            />
            <p className="text-sm text-muted-foreground">
              Percentuale trattenuta su ogni prenotazione
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stripe_fee">Commissione Stripe (%)</Label>
            <Input
              id="stripe_fee"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={stripeFee}
              onChange={(e) => setStripeFee(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Costi di elaborazione pagamento (stimati)
            </p>
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

export default PaymentConfiguration;
