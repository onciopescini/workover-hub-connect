
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, XCircle } from "lucide-react";
import { BookingWithDetails } from "@/types/booking";

interface RejectBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingWithDetails;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function RejectBookingDialog({
  open,
  onOpenChange,
  booking,
  onConfirm,
  isLoading = false
}: RejectBookingDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError(true);
      return;
    }
    setError(false);
    if (isLoading) return;
    await onConfirm(reason.trim());
  };

  // Reset reason when dialog opens
  React.useEffect(() => {
    if (open) {
      setReason("");
      setError(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            Rifiuta Prenotazione
          </DialogTitle>
          <DialogDescription>
            Stai per rifiutare la richiesta di prenotazione per "{booking.space?.title}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-700">
              Questa azione è irreversibile. Il coworker riceverà una notifica con il motivo del rifiuto.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-sm font-medium">
              Motivo del rifiuto <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="Spiega brevemente perché non puoi accettare questa prenotazione..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setError(false);
              }}
              rows={4}
              disabled={isLoading}
              className={error ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {error && (
              <p className="text-xs text-destructive font-medium">
                Il motivo del rifiuto è obbligatorio.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Rifiuto..." : "Conferma Rifiuto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
