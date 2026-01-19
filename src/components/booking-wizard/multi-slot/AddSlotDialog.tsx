import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DateSelectionStep } from '../DateSelectionStep';
import { TimeSlotSelectionStep } from '../TimeSlotSelectionStep';
import type { BookingSlot } from '@/types/booking';
import type { TimeSlot, SelectedTimeRange } from '../TwoStepBookingForm';
import { fetchOptimizedSpaceAvailability } from '@/lib/availability-rpc';
import { getAvailableCapacity } from '@/lib/capacity-utils';
import { useOptimisticSlotLock } from '@/hooks/useOptimisticSlotLock';
import { format } from 'date-fns';

interface AddSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  pricePerHour: number;
  pricePerDay: number;
  maxCapacity: number;
  availability?: any;
  bufferMinutes?: number;
  slotInterval?: number;
  onAddSlot: (slot: Omit<BookingSlot, 'id'>) => void;
  existingSlots: BookingSlot[];
}

type Step = 'DATE' | 'TIME';

export const AddSlotDialog: React.FC<AddSlotDialogProps> = ({
  open,
  onOpenChange,
  spaceId,
  pricePerHour,
  pricePerDay,
  maxCapacity,
  availability,
  bufferMinutes = 0,
  slotInterval = 30,
  onAddSlot,
  existingSlots
}) => {
  const [step, setStep] = useState<Step>('DATE');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedRange, setSelectedRange] = useState<SelectedTimeRange | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Optimistic lock for selected slot
  const { isLocked, acquireLock, releaseLock } = useOptimisticSlotLock({
    spaceId,
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    startTime: selectedRange?.startTime || '',
    endTime: selectedRange?.endTime || '',
    enabled: !!(selectedDate && selectedRange)
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('DATE');
      setSelectedDate(null);
      setAvailableSlots([]);
      setSelectedRange(null);
      releaseLock();
    }
  }, [open, releaseLock]);

  // Load time slots when date is selected
  useEffect(() => {
    if (!selectedDate || step !== 'TIME') return;

    const loadTimeSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Fetch availability data
        const availabilityData = await fetchOptimizedSpaceAvailability(
          spaceId,
          dateStr,
          dateStr
        );

        // Generate time slots (simplified - should match TimeSlotSelectionStep logic)
        const slots: TimeSlot[] = [];
        for (let hour = 0; hour < 24; hour++) {
          for (let minute = 0; minute < 60; minute += slotInterval) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Check if slot is available
            const isBooked = availabilityData.some((booking: any) => {
              return time >= booking.start_time && time < booking.end_time;
            });

            slots.push({
              time,
              available: !isBooked,
              reserved: isBooked
            });
          }
        }

        setAvailableSlots(slots);
      } catch (error) {
        console.error('Error loading time slots:', error);
        toast.error('Errore nel caricamento degli orari disponibili');
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadTimeSlots();
  }, [selectedDate, step, spaceId, maxCapacity, slotInterval]);

  // Try to acquire lock when range is selected
  useEffect(() => {
    if (selectedDate && selectedRange && !isLocked) {
      const success = acquireLock();
      if (!success) {
        toast.error('Questo slot è già in selezione da un altro utente');
        setSelectedRange(null);
      }
    }
  }, [selectedDate, selectedRange, acquireLock, isLocked]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep('TIME');
  };

  const handleTimeRangeSelect = (range: SelectedTimeRange) => {
    setSelectedRange(range);
  };

  const handleAddSlot = () => {
    if (!selectedDate || !selectedRange) return;

    // Check for duplicate slots
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const isDuplicate = existingSlots.some(
      slot =>
        slot.date === dateStr &&
        slot.startTime === selectedRange.startTime &&
        slot.endTime === selectedRange.endTime
    );

    if (isDuplicate) {
      toast.error('Questo slot è già stato aggiunto');
      return;
    }

    // Add the slot
    onAddSlot({
      date: dateStr,
      startTime: selectedRange.startTime,
      endTime: selectedRange.endTime,
      hasConflict: isLocked
    });

    toast.success('Slot aggiunto con successo');
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'TIME') {
      setStep('DATE');
      setSelectedRange(null);
      releaseLock();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Aggiungi Slot
          </DialogTitle>
          <DialogDescription>
            {step === 'DATE' && 'Seleziona la data della prenotazione'}
            {step === 'TIME' && 'Seleziona l\'orario desiderato'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 pb-4 border-b">
          <Badge variant={step === 'DATE' ? 'default' : 'outline'} className="gap-1">
            <Calendar className="h-3 w-3" />
            Data
          </Badge>
          <div className="flex-1 h-px bg-border" />
          <Badge variant={step === 'TIME' ? 'default' : 'outline'} className="gap-1">
            <Clock className="h-3 w-3" />
            Orario
          </Badge>
        </div>

        {/* Content */}
        <div className="py-4">
          {step === 'DATE' && (
            <DateSelectionStep
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              spaceId={spaceId}
              availability={availability}
            />
          )}

          {step === 'TIME' && selectedDate && (
            <>
              {isLocked && (
                <div className="mb-4 p-3 bg-orange-100 border border-orange-300 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      Slot in selezione
                    </p>
                    <p className="text-sm text-orange-700">
                      Qualcun altro sta selezionando questo orario. Completa velocemente la prenotazione.
                    </p>
                  </div>
                </div>
              )}
              
              <TimeSlotSelectionStep
                selectedDate={selectedDate}
                availableSlots={availableSlots}
                selectedRange={selectedRange}
                onRangeSelect={handleTimeRangeSelect}
                isLoading={isLoadingSlots}
                pricePerHour={pricePerHour}
                pricePerDay={pricePerDay}
                bufferMinutes={bufferMinutes}
                slotInterval={slotInterval}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 'TIME' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="w-full sm:w-auto"
            >
              Indietro
            </Button>
          )}
          
          <Button
            onClick={handleAddSlot}
            disabled={!selectedRange || isLocked}
            className="w-full sm:w-auto gap-2"
          >
            <Plus className="h-4 w-4" />
            Aggiungi Slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
