import React from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface GuestsSelectorProps {
  guestsCount: number;
  maxCapacity: number;
  onGuestsChange: (count: number) => void;
  disabled?: boolean;
  availableSpots?: number; // Number of spots still available (considering other bookings)
}

export function GuestsSelector({ 
  guestsCount, 
  maxCapacity, 
  onGuestsChange, 
  disabled = false,
  availableSpots 
}: GuestsSelectorProps) {
  const effectiveMax = availableSpots !== undefined ? availableSpots : maxCapacity;
  const canDecrement = guestsCount > 1;
  const canIncrement = guestsCount < effectiveMax;

  const handleDecrement = () => {
    if (canDecrement) {
      onGuestsChange(guestsCount - 1);
    }
  };

  const handleIncrement = () => {
    if (canIncrement) {
      onGuestsChange(guestsCount + 1);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        Ospiti
      </Label>
      
      <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Numero di ospiti</span>
          <span className="text-xs text-muted-foreground">
            {availableSpots !== undefined ? (
              <>Disponibili: {availableSpots}/{maxCapacity} posti</>
            ) : (
              <>Massimo {maxCapacity} ospiti</>
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDecrement}
            disabled={disabled || !canDecrement}
            className="h-8 w-8 p-0 rounded-full"
          >
            <Minus className="h-3 w-3" />
          </Button>
          
          <span className="min-w-[2rem] text-center font-medium">
            {guestsCount}
          </span>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleIncrement}
            disabled={disabled || !canIncrement}
            className="h-8 w-8 p-0 rounded-full"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}