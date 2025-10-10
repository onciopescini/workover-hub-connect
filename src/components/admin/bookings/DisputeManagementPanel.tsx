import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export function DisputeManagementPanel() {
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const queryClient = useQueryClient();

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      // For now, we'll get bookings with cancellations or payment issues
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
        space:spaces(id, title),
          coworker:profiles!bookings_user_id_fkey(id, first_name, last_name),
          payments(id, amount, payment_status)
        `)
        .or('cancelled_at.not.is.null,cancellation_reason.not.is.null')
        .order('cancelled_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    }
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ bookingId, resolution, refundAmount }: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log admin action
      const { error } = await supabase
        .from('admin_actions_log')
        .insert({
          admin_id: user.id,
          action_type: 'dispute_resolve',
          target_type: 'booking',
          target_id: bookingId,
          description: `Dispute resolved: ${resolution}`,
          metadata: { refund_amount: refundAmount }
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dispute risolta con successo");
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      setSelectedDispute(null);
      setResolution("");
      setRefundAmount("");
    },
    onError: () => {
      toast.error("Errore nella risoluzione della dispute");
    }
  });

  const handleResolve = () => {
    if (!selectedDispute || !resolution) return;
    resolveDisputeMutation.mutate({
      bookingId: selectedDispute.id,
      resolution,
      refundAmount: refundAmount ? parseFloat(refundAmount) : null
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Dispute Management</CardTitle>
          <CardDescription>Gestisci le dispute e i reclami degli utenti</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Caricamento...</p>
            ) : disputes?.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
                <p className="text-muted-foreground">Nessuna dispute attiva</p>
              </div>
            ) : (
              disputes?.map((dispute) => (
                <Card key={dispute.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {dispute.space?.title}
                        </CardTitle>
                        <CardDescription>
                          {dispute.coworker?.first_name} {dispute.coworker?.last_name}
                        </CardDescription>
                      </div>
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Dispute
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Data cancellazione</p>
                      <p className="font-medium">
                        {dispute.cancelled_at 
                          ? format(new Date(dispute.cancelled_at), "dd MMMM yyyy HH:mm", { locale: it })
                          : 'N/A'
                        }
                      </p>
                    </div>
                    {dispute.cancellation_reason && (
                      <div>
                        <p className="text-sm text-muted-foreground">Motivo</p>
                        <p className="text-sm">{dispute.cancellation_reason}</p>
                      </div>
                    )}
                    {dispute.payments?.[0] && (
                      <div>
                        <p className="text-sm text-muted-foreground">Importo pagamento</p>
                        <p className="font-medium">€{dispute.payments[0].amount.toFixed(2)}</p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDispute(dispute)}
                      className="w-full"
                    >
                      Gestisci Dispute
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Risolvi Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Azione</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona azione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve_refund">Approva rimborso completo</SelectItem>
                  <SelectItem value="partial_refund">Rimborso parziale</SelectItem>
                  <SelectItem value="reject">Rifiuta reclamo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resolution === 'partial_refund' && (
              <div>
                <Label>Importo Rimborso (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleResolve}
                disabled={!resolution || resolveDisputeMutation.isPending}
                className="flex-1"
              >
                {resolveDisputeMutation.isPending ? "Elaborazione..." : "Conferma"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedDispute(null)}
                className="flex-1"
              >
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
