import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { BookingSlot, MultiDayBookingData } from '@/types/booking';
import { SlotCard } from './SlotCard';
import { AddSlotDialog } from './AddSlotDialog';
import { calculateTwoStepBookingPrice } from '@/lib/booking-calculator-utils';
import { cn } from '@/lib/utils';

interface MultiSlotSelectorProps {
  spaceId: string;
  pricePerHour: number;
  pricePerDay: number;
  maxCapacity: number;
  availability?: any;
  bufferMinutes?: number;
  slotInterval?: number;
  onSlotsChange: (data: MultiDayBookingData) => void;
  className?: string;
}

export const MultiSlotSelector: React.FC<MultiSlotSelectorProps> = ({
  spaceId,
  pricePerHour,
  pricePerDay,
  maxCapacity,
  availability,
  bufferMinutes = 0,
  slotInterval = 30,
  onSlotsChange,
  className
}) => {
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Calculate total price and hours
  const calculateTotals = useCallback((currentSlots: BookingSlot[]): MultiDayBookingData => {
    let totalPrice = 0;
    let totalHours = 0;

    currentSlots.forEach(slot => {
      const [startHour = 0, startMin = 0] = slot.startTime.split(':').map(Number);
      const [endHour = 0, endMin = 0] = slot.endTime.split(':').map(Number);
      
      const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      const durationHours = durationMinutes / 60;
      
      totalHours += durationHours;

      // Use the same pricing logic as single bookings
      const pricing = calculateTwoStepBookingPrice(
        durationHours,
        pricePerHour,
        pricePerDay
      );
      
      totalPrice += pricing.basePrice;
    });

    return {
      slots: currentSlots,
      totalPrice,
      totalHours
    };
  }, [pricePerHour, pricePerDay]);

  const handleAddSlot = useCallback((newSlot: Omit<BookingSlot, 'id'>) => {
    const slotWithId: BookingSlot = {
      ...newSlot,
      id: `${newSlot.date}-${newSlot.startTime}-${Date.now()}`
    };

    const updatedSlots = [...slots, slotWithId];
    setSlots(updatedSlots);
    
    const totals = calculateTotals(updatedSlots);
    onSlotsChange(totals);
    
    setAddDialogOpen(false);
  }, [slots, calculateTotals, onSlotsChange]);

  const handleRemoveSlot = useCallback((slotId: string) => {
    const updatedSlots = slots.filter(s => s.id !== slotId);
    setSlots(updatedSlots);
    
    const totals = calculateTotals(updatedSlots);
    onSlotsChange(totals);
  }, [slots, calculateTotals, onSlotsChange]);

  const totals = calculateTotals(slots);
  const hasConflicts = slots.some(s => s.hasConflict);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prenotazione Multi-Slot
            </CardTitle>
            <Button
              onClick={() => setAddDialogOpen(true)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Aggiungi Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Slot Selezionati</p>
              <p className="text-2xl font-bold">{slots.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ore Totali</p>
              <p className="text-2xl font-bold">{totals.totalHours.toFixed(1)}h</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Prezzo Totale</p>
              <p className="text-2xl font-bold text-primary">
                €{totals.totalPrice.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Conflicts Warning */}
          {hasConflicts && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  Conflitti Rilevati
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  Alcuni slot selezionati presentano conflitti. Rimuovili o scegli orari alternativi.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slots List */}
      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">
                  Nessuno slot selezionato
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aggiungi uno o più slot per creare la tua prenotazione
                </p>
              </div>
              <Button
                onClick={() => setAddDialogOpen(true)}
                variant="outline"
                className="gap-2 mt-4"
              >
                <Plus className="h-4 w-4" />
                Aggiungi il Primo Slot
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              pricePerHour={pricePerHour}
              pricePerDay={pricePerDay}
              onRemove={() => handleRemoveSlot(slot.id)}
            />
          ))}
        </div>
      )}

      {/* Add Slot Dialog */}
      <AddSlotDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        spaceId={spaceId}
        pricePerHour={pricePerHour}
        pricePerDay={pricePerDay}
        maxCapacity={maxCapacity}
        availability={availability}
        bufferMinutes={bufferMinutes}
        slotInterval={slotInterval}
        onAddSlot={handleAddSlot}
        existingSlots={slots}
      />
    </div>
  );
};
