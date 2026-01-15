import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSettings } from "@/hooks/admin/useAdminSettings";
import { Loader2 } from "lucide-react";

const BookingRulesSettings = () => {
  const { settings, isLoading, updateSetting } = useAdminSettings("booking");
  
  const [minDuration, setMinDuration] = useState(settings?.["min_booking_duration"] || 60);
  const [maxDuration, setMaxDuration] = useState(settings?.["max_booking_duration"] || 480);
  const [approvalTimeout, setApprovalTimeout] = useState(settings?.["booking_approval_timeout_hours"] || 24);
  const [paymentDeadline, setPaymentDeadline] = useState(settings?.["payment_deadline_minutes"] || 15);
  const [cancellationFee, setCancellationFee] = useState(settings?.["cancellation_fee_percentage"] || 20);

  const handleSave = async () => {
    try {
      await updateSetting("min_booking_duration", Number(minDuration));
      await updateSetting("max_booking_duration", Number(maxDuration));
      await updateSetting("booking_approval_timeout_hours", Number(approvalTimeout));
      await updateSetting("payment_deadline_minutes", Number(paymentDeadline));
      await updateSetting("cancellation_fee_percentage", Number(cancellationFee));

      toast.success("Impostazioni salvate", { description: "Le regole di prenotazione sono state aggiornate" });
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
        <h3 className="text-lg font-semibold mb-4">Durata Prenotazioni</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="min_duration">Durata Minima (minuti)</Label>
            <Input
              id="min_duration"
              type="number"
              min="15"
              step="15"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_duration">Durata Massima (minuti)</Label>
            <Input
              id="max_duration"
              type="number"
              min="60"
              step="60"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Timeout e Scadenze</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approval_timeout">Timeout Approvazione Host (ore)</Label>
            <Input
              id="approval_timeout"
              type="number"
              min="1"
              max="72"
              value={approvalTimeout}
              onChange={(e) => setApprovalTimeout(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Tempo massimo per l'host per approvare una richiesta
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_deadline">Scadenza Pagamento (minuti)</Label>
            <Input
              id="payment_deadline"
              type="number"
              min="5"
              max="60"
              value={paymentDeadline}
              onChange={(e) => setPaymentDeadline(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Tempo per completare il pagamento dopo approvazione
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Politiche Cancellazione</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancellation_fee">Penale Cancellazione (%)</Label>
            <Input
              id="cancellation_fee"
              type="number"
              min="0"
              max="100"
              step="5"
              value={cancellationFee}
              onChange={(e) => setCancellationFee(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Percentuale trattenuta in caso di cancellazione tardiva
            </p>
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

export default BookingRulesSettings;
