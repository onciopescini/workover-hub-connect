import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

interface RefundProcessorProps {
  paymentId: string;
  bookingId: string;
  amount: number;
}

export function RefundProcessor({ paymentId, bookingId, amount }: RefundProcessorProps) {
  const [refundAmount, setRefundAmount] = useState(amount.toString());
  const [refundReason, setRefundReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const refundMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const refundValue = parseFloat(refundAmount);
      
      // Update payment status
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ payment_status: 'refund_pending' })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Log admin action
      const { error: logError } = await supabase
        .from('admin_actions_log')
        .insert({
          admin_id: user.id,
          action_type: 'refund_process',
          target_type: 'payment',
          target_id: paymentId,
          description: `Refund processed: €${refundValue.toFixed(2)} - ${refundReason}`,
          metadata: { 
            booking_id: bookingId, 
            amount: refundValue, 
            reason: refundReason,
            notes 
          }
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      toast.success("Rimborso avviato con successo");
      queryClient.invalidateQueries({ queryKey: ['admin-booking-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    },
    onError: () => {
      toast.error("Errore nell'elaborazione del rimborso");
    }
  });

  const handleRefund = () => {
    if (!refundReason) {
      toast.error("Seleziona un motivo per il rimborso");
      return;
    }

    const refundValue = parseFloat(refundAmount);
    if (isNaN(refundValue) || refundValue <= 0 || refundValue > amount) {
      toast.error("Importo rimborso non valido");
      return;
    }

    refundMutation.mutate();
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Elabora Rimborso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Importo Rimborso (€)</Label>
          <Input
            type="number"
            step="0.01"
            max={amount}
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Importo originale: €{amount.toFixed(2)}
          </p>
        </div>

        <div>
          <Label>Motivo Rimborso</Label>
          <Select value={refundReason} onValueChange={setRefundReason}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="duplicate">Transazione duplicata</SelectItem>
              <SelectItem value="fraudulent">Frode</SelectItem>
              <SelectItem value="requested_by_customer">Richiesta utente</SelectItem>
              <SelectItem value="service_issue">Problema servizio</SelectItem>
              <SelectItem value="administrative">Motivi amministrativi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Note (opzionale)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aggiungi note interne sul rimborso..."
            rows={3}
          />
        </div>

        <Button
          onClick={handleRefund}
          disabled={refundMutation.isPending || !refundReason}
          className="w-full"
          variant="destructive"
        >
          {refundMutation.isPending ? "Elaborazione..." : "Elabora Rimborso"}
        </Button>
      </CardContent>
    </Card>
  );
}
