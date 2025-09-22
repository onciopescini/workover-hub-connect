import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Euro, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { computePricing, getServiceFeePct, getDefaultVatPct, isStripeTaxEnabled } from "@/lib/pricing";
import type { SelectedTimeRange } from './TwoStepBookingForm';

interface BookingSummaryStepProps {
  selectedDate: Date;
  selectedRange: SelectedTimeRange;
  pricePerHour: number;
  pricePerDay: number;
  confirmationType: string;
}

export function BookingSummaryStep({
  selectedDate,
  selectedRange,
  pricePerHour,
  pricePerDay,
  confirmationType
}: BookingSummaryStepProps) {
  const stripeTaxEnabled = isStripeTaxEnabled();
  
  const pricing = computePricing({
    durationHours: selectedRange.duration,
    pricePerHour,
    pricePerDay,
    serviceFeePct: getServiceFeePct(),
    vatPct: getDefaultVatPct(),
    stripeTaxEnabled
  });

  const isInstantBooking = confirmationType === 'instant';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Riepilogo prenotazione</h3>
        <p className="text-sm text-muted-foreground">
          Controlla i dettagli prima di confermare
        </p>
      </div>

      {/* Booking Details Card */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">
                  {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: it })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedRange.startTime} - {selectedRange.endTime}
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="font-medium">
                  {selectedRange.duration}h di utilizzo
                </div>
                <div className="text-sm text-muted-foreground">
                  <Badge variant={pricing.isDayRate ? "default" : "secondary"} className="text-xs">
                    {pricing.isDayRate ? "Tariffa giornaliera" : "Tariffa oraria"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Confirmation Type */}
            <div className="flex items-start gap-3">
              {isInstantBooking ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {isInstantBooking ? 'Prenotazione immediata' : 'Richiede approvazione'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isInstantBooking 
                    ? 'La prenotazione sarà confermata immediatamente dopo il pagamento'
                    : 'L\'host risponderà entro 24 ore'
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Breakdown */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {pricing.breakdownLabel}
              </span>
              <span className="font-medium">€{pricing.base.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Service fee</span>
                <Info className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="font-medium">€{pricing.serviceFee.toFixed(2)}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotale</span>
              <span className="font-medium">€{(pricing.base + pricing.serviceFee).toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">IVA (22%)</span>
              {stripeTaxEnabled ? (
                <span className="text-sm text-muted-foreground italic">calcolata al pagamento</span>
              ) : (
                <span className="font-medium">€{pricing.vat.toFixed(2)}</span>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-lg font-semibold" aria-live="polite">
              <span>Totale</span>
              <div className="flex items-center">
                <Euro className="w-4 h-4 mr-1" />
                <span>€{pricing.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Note importanti
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Lo slot sarà riservato per 10 minuti durante il processo di pagamento</li>
          {isInstantBooking ? (
            <li>• Sarai reindirizzato a Stripe per completare il pagamento</li>
          ) : (
            <li>• Riceverai una notifica quando l'host approverà la prenotazione</li>
          )}
          <li>• Le politiche di cancellazione si applicano dopo la conferma</li>
        </ul>
      </div>
    </div>
  );
}