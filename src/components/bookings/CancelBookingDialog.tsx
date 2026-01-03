
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
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Euro } from "lucide-react";
import { calculateCancellationFee } from "@/lib/booking-utils";
import { BookingWithDetails } from "@/types/booking";

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingWithDetails;
  onConfirm: (reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  booking,
  onConfirm,
  isLoading = false
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState("");
  
  const cancellationInfo = calculateCancellationFee(
    booking.booking_date, 
    booking.space?.price_per_day || 0,
    booking.start_time // Pass start_time for accurate hourly calculation
  );

  const handleConfirm = async () => {
    // Prevent double submission
    if (isLoading) return;

    await onConfirm(reason.trim() || undefined);
    // Only clear reason if successful - but onConfirm is likely void.
    // We rely on the parent to close the dialog on success, or keep it open on error.
    // If it stays open, we might want to keep the reason.
    // But standard pattern is setReason("") if successful.
    // Since we don't know the result here (async void), we'll reset when dialog closes/opens.
  };

  // Reset reason when dialog opens
  React.useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Conferma Cancellazione
          </DialogTitle>
          <DialogDescription>
            Stai per cancellare la tua prenotazione per "{booking.space?.title}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cancellation fee information */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Penale di cancellazione:</span>
              <Badge variant={cancellationInfo.fee > 0 ? "destructive" : "default"}>
                {cancellationInfo.percentage}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Euro className="w-4 h-4" />
              <span>
                {cancellationInfo.fee > 0 
                  ? `€${cancellationInfo.fee.toFixed(2)} di penale`
                  : "Cancellazione gratuita"
                }
              </span>
            </div>
            
            <p className="text-sm text-gray-600">
              {cancellationInfo.description}
            </p>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo della cancellazione (opzionale)</Label>
            <Textarea
              id="reason"
              placeholder="Inserisci il motivo della cancellazione..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Warning for fees */}
          {cancellationInfo.fee > 0 && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-700">Attenzione</p>
                <p className="text-orange-600">
                  Questa cancellazione comporterà una penale di €{cancellationInfo.fee.toFixed(2)}.
                  L'importo non sarà rimborsato.
                </p>
              </div>
            </div>
          )}
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
            {isLoading ? "Cancellazione..." : "Conferma Cancellazione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
