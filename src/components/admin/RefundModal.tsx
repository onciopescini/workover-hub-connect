import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, RefreshCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminBooking } from '@/types/admin';
import { formatCurrency } from '@/lib/format';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: AdminBooking;
  onSuccess: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) => {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [reason, setReason] = useState('');

  const refundMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        bookingId: booking.booking_id,
        refundType,
        reason,
      };

      if (refundType === 'partial') {
        // Convert to cents for Stripe
        const amountInCents = Math.round(parseFloat(partialAmount) * 100);
        if (isNaN(amountInCents) || amountInCents <= 0) {
          throw new Error('Importo non valido');
        }
        if (amountInCents > booking.total_price) {
          throw new Error('L\'importo supera il totale della prenotazione');
        }
        body['amount'] = amountInCents;
      }

      const { data, error } = await supabase.functions.invoke('admin-process-refund', {
        body,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      toast.success('Rimborso elaborato con successo su Stripe');
      onSuccess();
      handleClose();
    },
    onError: (error) => {
      toast.error(`Errore durante il rimborso: ${error.message}`);
    },
  });

  const handleClose = () => {
    setRefundType('full');
    setPartialAmount('');
    setReason('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refundMutation.mutate();
  };

  const maxRefundAmount = booking.total_price / 100; // Convert from cents

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-orange-600" />
            Elabora Rimborso
          </DialogTitle>
          <DialogDescription>
            Prenotazione #{booking.booking_id.slice(0, 8)} - {booking.coworker_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Booking Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spazio:</span>
              <span className="font-medium">{booking.space_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totale pagato:</span>
              <span className="font-medium font-mono">
                {formatCurrency(booking.total_price, { cents: true })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stato:</span>
              <span className="font-medium capitalize">{booking.status}</span>
            </div>
          </div>

          {/* Refund Type */}
          <div className="space-y-3">
            <Label>Tipo di rimborso</Label>
            <RadioGroup
              value={refundType}
              onValueChange={(value) => setRefundType(value as 'full' | 'partial')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Rimborso completo ({formatCurrency(booking.total_price, { cents: true })})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="font-normal cursor-pointer">
                  Rimborso parziale
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Partial Amount */}
          {refundType === 'partial' && (
            <div className="space-y-2">
              <Label htmlFor="amount">Importo da rimborsare (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefundAmount}
                placeholder="0.00"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Massimo: €{maxRefundAmount.toFixed(2)}
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo del rimborso</Label>
            <Textarea
              id="reason"
              placeholder="Descrivi il motivo del rimborso..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg text-orange-800 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Attenzione</p>
              <p>
                Questa azione processerà un rimborso su Stripe e aggiornerà lo stato
                della prenotazione. L'operazione non può essere annullata.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700"
              disabled={refundMutation.isPending || (refundType === 'partial' && !partialAmount)}
            >
              {refundMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Conferma Rimborso
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RefundModal;
