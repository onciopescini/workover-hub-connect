import { useState, useEffect } from "react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function DisputeManagementPanel() {
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const queryClient = useQueryClient();

  const { data: disputesData, isLoading } = useQuery({
    queryKey: ['admin-disputes', page],
    queryFn: async () => {
      // Query the actual disputes table
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('disputes')
        .select(`
          *,
          booking:bookings(
            id,
            booking_date,
            status,
            cancelled_at,
            cancellation_reason,
            space:spaces(id, title),
            payments(id, amount, payment_status)
          ),
          opener:profiles!disputes_opened_by_fkey(id, first_name, last_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      // Transform data to easy to use structure
      const transformedDisputes = (data || []).map(dispute => {
        const booking = dispute.booking as any; // Cast as any because type might be array or object depending on relation
        // In one-to-one or many-to-one, it should be object. booking_id is in disputes.

        return {
          id: dispute.id,
          created_at: dispute.created_at,
          status: dispute.status,
          reason: dispute.reason,
          booking: {
            ...booking,
            space: booking?.space, // space inside booking
            payments: booking?.payments
          },
          opener: dispute.opener
        };
      });

      return { disputes: transformedDisputes, count: count || 0 };
    },
    placeholderData: (previousData) => previousData
  });

  const disputes = disputesData?.disputes || [];
  const totalCount = disputesData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

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

      // Also update dispute status
      // We assume the Edge Function handles the refund status on booking/payment
      // We just close the dispute record here
      if (selectedDispute) {
         await supabase
          .from('disputes')
          .update({
            status: 'resolved',
            admin_notes: `Resolved via ${resolution}. Refund: ${refundAmount}`
          })
          .eq('id', selectedDispute.id);
      }
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
      bookingId: selectedDispute.booking?.id, // Use booking id from selected dispute
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
            ) : disputes.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
                <p className="text-muted-foreground">Nessuna dispute attiva</p>
              </div>
            ) : (
              disputes.map((dispute) => (
                <Card key={dispute.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {dispute.booking?.space?.title || 'Unknown Space'}
                        </CardTitle>
                        <CardDescription>
                          Aperta da: {dispute.opener?.first_name} {dispute.opener?.last_name}
                        </CardDescription>
                      </div>
                      <Badge variant={dispute.status === 'open' ? "destructive" : "default"}>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {dispute.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Data Creazione</p>
                          <p className="font-medium">
                            {format(new Date(dispute.created_at), "dd MMMM yyyy HH:mm", { locale: it })}
                          </p>
                        </div>
                         <div>
                          <p className="text-sm text-muted-foreground">Booking ID</p>
                          <p className="text-sm font-mono truncate">{dispute.booking?.id}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm text-muted-foreground">Motivo Dispute</p>
                        <p className="text-sm">{dispute.reason}</p>
                    </div>

                    {dispute.booking?.cancellation_reason && (
                      <div className="bg-muted/50 p-2 rounded text-sm">
                         <span className="font-semibold">Motivo Cancellazione:</span> {dispute.booking.cancellation_reason}
                      </div>
                    )}

                    {dispute.booking?.payments?.[0] && (
                      <div>
                        <p className="text-sm text-muted-foreground">Importo pagamento</p>
                        <p className="font-medium">€{dispute.booking.payments[0].amount.toFixed(2)}</p>
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

            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(p => p - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" onClick={(e) => e.preventDefault()} isActive>
                    {page} di {Math.max(1, totalPages)}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(p => p + 1);
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

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
