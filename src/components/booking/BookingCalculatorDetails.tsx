import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Euro, Info } from "lucide-react";
import { computePricing, getServiceFeePct, getDefaultVatPct, isStripeTaxEnabled } from "@/lib/pricing";

interface BookingCalculatorDetailsProps {
  durationHours: number;
  pricePerHour: number;
  pricePerDay: number;
  className?: string;
}

export function BookingCalculatorDetails({
  durationHours,
  pricePerHour,
  pricePerDay,
  className = ""
}: BookingCalculatorDetailsProps) {
  const stripeTaxEnabled = isStripeTaxEnabled();
  
  const pricing = computePricing({
    durationHours,
    pricePerHour,
    pricePerDay,
    serviceFeePct: getServiceFeePct(),
    vatPct: getDefaultVatPct(),
    stripeTaxEnabled
  });

  return (
    <Card className={className}>
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
            <span className="text-sm text-muted-foreground">
              IVA {stripeTaxEnabled ? '' : `(${Math.round(getDefaultVatPct() * 100)}%)`}
            </span>
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
  );
}