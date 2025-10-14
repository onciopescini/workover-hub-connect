import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KycApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  host: any;
  approving: boolean;
  onSuccess: () => void;
}

export const KycApprovalDialog: React.FC<KycApprovalDialogProps> = ({
  open,
  onOpenChange,
  host,
  approving,
  onSuccess,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!approving && !rejectionReason.trim()) {
      toast.error('Inserisci un motivo di rifiuto');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('approve-kyc', {
        body: {
          host_id: host.id,
          approved: approving,
          rejection_reason: approving ? null : rejectionReason,
        },
      });

      if (error) throw error;

      toast.success(
        approving
          ? 'KYC approvato con successo'
          : 'KYC rifiutato con successo'
      );
      
      onSuccess();
      onOpenChange(false);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error processing KYC:', error);
      toast.error('Errore durante l\'elaborazione: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {approving ? 'Approva' : 'Rifiuta'} Verifica KYC
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Host: <span className="font-medium text-foreground">
              {host.first_name} {host.last_name}
            </span>
          </p>

          {approving ? (
            <p className="text-sm">
              Confermi di voler approvare la verifica KYC per questo host?
              L'host potrà pubblicare i suoi spazi dopo l'approvazione.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Motivo del rifiuto <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Specifica perché i dati fiscali non sono stati approvati..."
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button
            variant={approving ? 'default' : 'destructive'}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Elaborazione...' : approving ? 'Approva' : 'Rifiuta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
