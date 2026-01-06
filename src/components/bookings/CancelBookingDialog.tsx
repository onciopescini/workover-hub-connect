
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
import { calculateRefund } from "@/lib/policy-calculator";
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
  
  // Calculate cancellation details on render (safe as it's cheap)
  // Use booking's policy snapshot if available, otherwise fallback to space policy
  // Default to 'moderate' if both are missing (though space policy should be there)
  // We cast to string because booking.space might not have cancellation_policy in strict types yet
  // but we know it should be there or we default.
  // Actually, BookingWithDetails.space doesn't have cancellation_policy in the type definition I saw earlier?
  // Let's check: "space: { ... confirmation_type?: string; }"
  // The user said: "If strictly null, fallback to the workspace policy".
  // I might need to access it as `(booking.space as any).cancellation_policy`.
  const policy = booking.cancellation_policy || (booking.space as any).cancellation_policy || 'moderate';

  // Determine amount
  // "Use booking.payments[0].amount if available. Fallback: booking.space.price_per_hour * duration"
  let originalPrice = 0;
  if (booking.payments && booking.payments.length > 0) {
    originalPrice = booking.payments[0].amount;
  } else {
    // Fallback calculation
    // We need duration in hours.
    // booking.start_time and booking.end_time are strings "HH:MM:SS"
    // booking.booking_date is "YYYY-MM-DD"
    // This is a rough estimation. For exact calculation we need full Date objects.
    const start = new Date(`${booking.booking_date}T${booking.start_time}`);
    const end = new Date(`${booking.booking_date}T${booking.end_time}`);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    // price_per_day? The fallback instruction said "price_per_hour * duration".
    // But if it's a daily booking?
    // The prompt: "Fallback: If no payment record exists, calculate it: booking.space.price_per_hour * duration."
    // I will stick to this instructions strictly.
    const pricePerHour = (booking.space as any).price_per_hour || 0;
    originalPrice = pricePerHour * durationHours;
  }

  const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}`);

  const refundDetails = calculateRefund(
    originalPrice,
    policy,
    bookingStart
  );

  const handleConfirm = async () => {
    if (isLoading) return;
    await onConfirm(reason.trim() || undefined);
  };

  // Reset reason when dialog opens
  React.useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  // Determine policy label (capitalize first letter)
  const policyLabel = policy.charAt(0).toUpperCase() + policy.slice(1);

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
          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">

            {/* Policy & Original Price Row */}
            <div className="flex justify-between text-sm">
               <span className="text-gray-500">Policy:</span>
               <span className="font-medium">{policyLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
               <span className="text-gray-500">Prezzo Originale:</span>
               <span className="font-medium">€{originalPrice.toFixed(2)}</span>
            </div>

            <div className="h-px bg-gray-200 my-2" />

            {/* Penalty Row */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-red-600">Penale:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">
                  -€{refundDetails.penaltyAmount.toFixed(2)}
                </span>
                <Badge variant="destructive" className="text-xs">
                  {refundDetails.penaltyPercentage.toFixed(0)}%
                </Badge>
              </div>
            </div>
            
            {/* Refund Row */}
             <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-gray-900">Rimborso:</span>
              <span className="font-bold text-green-600 text-lg">
                €{refundDetails.refundAmount.toFixed(2)}
              </span>
            </div>

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

          {/* Warning for 0 refund */}
          {refundDetails.refundAmount === 0 && (
             <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-700">Attenzione</p>
                <p className="text-red-600">
                  Questa cancellazione non è rimborsabile in base alla policy applicata.
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
