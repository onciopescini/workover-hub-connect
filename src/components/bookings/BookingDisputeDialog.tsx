import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { BookingWithDetails } from '@/types/booking';

interface BookingDisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingWithDetails;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function BookingDisputeDialog({
  open,
  onOpenChange,
  booking,
  onConfirm,
  isLoading = false,
}: BookingDisputeDialogProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (isLoading) {
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return;
    }

    await onConfirm(trimmedReason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Segnala un problema / Richiedi Rimborso
          </DialogTitle>
          <DialogDescription>
            Descrivi in modo dettagliato il problema riscontrato per la prenotazione di "{booking.space?.title}".
            Il supporto analizzerà la richiesta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="dispute-reason">Motivazione</Label>
          <Textarea
            id="dispute-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Spiega cosa è successo e perché stai richiedendo assistenza o rimborso..."
            rows={5}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">La motivazione è obbligatoria.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || reason.trim().length === 0}>
            {isLoading ? 'Invio richiesta...' : 'Invia richiesta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
