import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Euro, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { BookingSlot } from '@/types/booking';
import { calculateTwoStepBookingPrice } from '@/lib/booking-calculator-utils';
import { cn } from '@/lib/utils';

interface SlotCardProps {
  slot: BookingSlot;
  pricePerHour: number;
  pricePerDay: number;
  onRemove: () => void;
  className?: string;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  pricePerHour,
  pricePerDay,
  onRemove,
  className
}) => {
  // Calculate duration and price
  const [startHour = 0, startMin = 0] = slot.startTime.split(':').map(Number);
  const [endHour = 0, endMin = 0] = slot.endTime.split(':').map(Number);
  
  const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  const durationHours = durationMinutes / 60;
  
  const pricing = calculateTwoStepBookingPrice(
    durationHours,
    pricePerHour,
    pricePerDay
  );

  const date = parseISO(slot.date);
  const formattedDate = format(date, 'EEEE, d MMMM yyyy', { locale: it });

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      slot.hasConflict && 'border-destructive bg-destructive/5',
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Slot Info */}
          <div className="flex-1 space-y-3">
            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium capitalize">{formattedDate}</p>
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                <span className="font-medium">{slot.startTime}</span>
                {' - '}
                <span className="font-medium">{slot.endTime}</span>
                <span className="text-muted-foreground ml-2">
                  ({durationHours.toFixed(1)}h)
                </span>
              </p>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                <span className="font-semibold text-primary">
                  €{pricing.basePrice.toFixed(2)}
                </span>
                <span className="text-muted-foreground ml-2">
                  {pricing.isDayRate ? '(tariffa giornaliera)' : '(tariffa oraria)'}
                </span>
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {slot.hasConflict ? (
                <>
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Conflitto
                  </Badge>
                  {slot.conflictMessage && (
                    <p className="text-xs text-destructive">{slot.conflictMessage}</p>
                  )}
                </>
              ) : (
                <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  Disponibile
                </Badge>
              )}
            </div>

            {/* Suggestions */}
            {slot.suggestions && slot.suggestions.length > 0 && (
              <div className="mt-2 p-2 bg-muted/50 rounded-md">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Orari alternativi disponibili:
                </p>
                <div className="flex flex-wrap gap-1">
                  {slot.suggestions.map((suggestion, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
