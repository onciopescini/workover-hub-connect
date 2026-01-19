import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertCircle, CheckCircle, CalendarX } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { calculateTwoStepBookingPrice } from "@/lib/booking-calculator-utils";
import type { SelectedTimeRange } from './TwoStepBookingForm';
import type { BookingTimeSlot } from "@/types/booking-slots";

// Helper functions for safe HH:MM parsing
function parseHHMM(time: string): [number, number] {
  const parts = time.split(':');
  const hour = parseInt(parts[0] || '0');
  const minute = parseInt(parts[1] || '0');
  return [hour, minute];
}

function addMinutesHHMM(time: string, minutes: number): string {
  const [hour, minute] = parseHHMM(time);
  const totalMinutes = hour * 60 + minute + minutes;
  const newHour = Math.floor(totalMinutes / 60);
  const newMinute = totalMinutes % 60;
  return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
}

interface TimeSlotSelectionStepProps {
  selectedDate: Date;
  availableSlots: BookingTimeSlot[];
  selectedRange: SelectedTimeRange | null;
  onRangeSelect: (range: SelectedTimeRange) => void;
  isLoading: boolean;
  pricePerHour: number;
  pricePerDay: number;
  bufferMinutes: number;
  slotInterval?: number;
  onBack?: () => void;
}

export function TimeSlotSelectionStep({
  selectedDate,
  availableSlots,
  selectedRange,
  onRangeSelect,
  isLoading,
  pricePerHour,
  pricePerDay,
  bufferMinutes,
  slotInterval = 30,
  onBack
}: TimeSlotSelectionStepProps) {
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number>(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  // Reset selection when slots change
  useEffect(() => {
    setSelectionStart(null);
    setFocusedSlotIndex(-1);
  }, [availableSlots]);

  const availableSlotsList = availableSlots.filter(slot => slot.available);

  const handleSlotClick = (slotTime: string) => {
    const slot = availableSlots.find(s => s.time === slotTime);
    if (!slot?.available) return;

    if (!selectionStart) {
      // Start selection
      setSelectionStart(slotTime);
    } else {
      // Complete selection
      const startIndex = availableSlots.findIndex(s => s.time === selectionStart);
      const endIndex = availableSlots.findIndex(s => s.time === slotTime);
      
      if (startIndex === -1 || endIndex === -1) return;
      
      const [actualStart, actualEnd] = startIndex <= endIndex 
        ? [startIndex, endIndex] 
        : [endIndex, startIndex];
      
      // Check if all slots in range are available and contiguous
      const rangeSlots = availableSlots.slice(actualStart, actualEnd + 1);
      const allAvailable = rangeSlots.every(s => s.available);
      
      if (!allAvailable) {
        setSelectionStart(slotTime); // Start new selection
        return;
      }

      // Check contiguity: each slot should be followed by the next expected slot
      for (let i = actualStart; i < actualEnd; i++) {
        const currentSlot = availableSlots[i];
        const nextSlot = availableSlots[i + 1];
        
        if (!currentSlot || !nextSlot) {
          setSelectionStart(slotTime); // Start new selection - invalid slots
          return;
        }
        
        const expectedNextTime = addMinutesHHMM(currentSlot.time, slotInterval);
        
        if (nextSlot.time !== expectedNextTime) {
          setSelectionStart(slotTime); // Start new selection - slots not contiguous
          return;
        }
      }

      const startSlot = availableSlots[actualStart];
      const endSlot = availableSlots[actualEnd];
      
      if (!startSlot || !endSlot) return;
      
      const startTime = startSlot.time;
      const endTime = addMinutesHHMM(endSlot.time, slotInterval);
      
      const [startHour, startMinute] = parseHHMM(startTime);
      const [endHour, endMinute] = parseHHMM(endTime);
      
      const duration = (endHour + endMinute / 60) - (startHour + startMinute / 60);
      
      const range: SelectedTimeRange = {
        startTime,
        endTime,
        duration
      };
      
      onRangeSelect(range);
      setSelectionStart(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, slotTime: string, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleSlotClick(slotTime);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (index < availableSlotsList.length - 1) {
          setFocusedSlotIndex(index + 1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) {
          setFocusedSlotIndex(index - 1);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (index + 4 < availableSlotsList.length) {
          setFocusedSlotIndex(index + 4);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index - 4 >= 0) {
          setFocusedSlotIndex(index - 4);
        }
        break;
      case 'Escape':
        setSelectionStart(null);
        break;
    }
  };

  const isSlotInRange = (slotTime: string): boolean => {
    if (!selectedRange) return false;
    return slotTime >= selectedRange.startTime && slotTime < selectedRange.endTime;
  };

  const isSlotInPreview = (slotTime: string): boolean => {
    if (!selectionStart || !hoveredSlot) return false;
    
    const startIndex = availableSlots.findIndex(s => s.time === selectionStart);
    const hoverIndex = availableSlots.findIndex(s => s.time === hoveredSlot);
    const slotIndex = availableSlots.findIndex(s => s.time === slotTime);
    
    const [actualStart, actualEnd] = startIndex <= hoverIndex 
      ? [startIndex, hoverIndex] 
      : [hoverIndex, startIndex];
    
    return slotIndex >= actualStart && slotIndex <= actualEnd;
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${start} - ${end}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Caricamento orari disponibili...</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Data: {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: it })}
          </p>
        </div>
        
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (availableSlotsList.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Seleziona l'orario</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Data: {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: it })}
          </p>
        </div>
        
        <div 
          className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-lg text-center"
          role="status"
          aria-live="polite"
        >
          <CalendarX className="w-12 h-12 mb-3 text-muted-foreground" />
          <h4 className="font-medium mb-2">Nessuno slot disponibile</h4>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            Lo spazio non è disponibile in questa data.
          </p>
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="mt-2"
            >
              Seleziona altra data
            </Button>
          )}
        </div>
      </div>
    );
  }

  const pricing = selectedRange ? calculateTwoStepBookingPrice(
    selectedRange.duration,
    pricePerHour,
    pricePerDay
  ) : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Seleziona l'orario</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Data: {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: it })}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
            <span>Disponibile</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary border border-primary-foreground rounded"></div>
            <span>Selezionato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded"></div>
            <span>Non disponibile</span>
          </div>
        </div>
      </div>

      {/* Time Slots Grid */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Orari configurati dall'host per questa data
        </p>
        <div 
          ref={gridRef}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"
          role="grid"
          aria-label="Griglia slot orari"
        >
          {availableSlotsList.map((slot, index) => (
            <button
              key={slot.time}
              className={cn(
                "h-12 min-w-[80px] text-sm font-medium transition-all px-4 py-2.5 rounded-md border text-center whitespace-nowrap",
                {
                  "bg-green-50 border-green-200 text-green-800 hover:bg-green-100": 
                    slot.available && !isSlotInRange(slot.time) && !isSlotInPreview(slot.time),
                  "bg-primary text-primary-foreground border-primary hover:bg-primary/90": 
                    isSlotInRange(slot.time),
                  "bg-primary/20 border-primary text-primary": 
                    isSlotInPreview(slot.time),
                  "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed": 
                    !slot.available,
                  "ring-2 ring-primary ring-offset-1": 
                    index === focusedSlotIndex
                }
              )}
              onClick={() => handleSlotClick(slot.time)}
              onMouseEnter={() => setHoveredSlot(slot.time)}
              onMouseLeave={() => setHoveredSlot(null)}
              onKeyDown={(e) => handleKeyDown(e, slot.time, index)}
              onFocus={() => setFocusedSlotIndex(index)}
              disabled={!slot.available}
              aria-pressed={isSlotInRange(slot.time)}
              data-testid={`time-slot-${slot.time.replace(':', '_')}`}
              tabIndex={index === 0 || index === focusedSlotIndex ? 0 : -1}
            >
              {slot.time}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div 
        className="text-center text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg"
        role="status"
        aria-live="polite"
        aria-label="Istruzioni selezione"
      >
        {!selectionStart ? (
          <p>Clicca su uno slot per iniziare la selezione del range orario</p>
        ) : (
          <p>Clicca su un altro slot per completare la selezione del range</p>
        )}
      </div>

      {/* Selection Summary */}
      {selectedRange && (
        <div 
          className="p-4 bg-primary/5 border border-primary/20 rounded-lg"
          data-testid="time-range-summary"
          role="region"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-medium">Range selezionato</h4>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Orario:</span>
              <span className="font-medium">
                {formatTimeRange(selectedRange.startTime, selectedRange.endTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Durata:</span>
              <span className="font-medium">{selectedRange.duration}h</span>
            </div>
            {pricing && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo prezzo:</span>
                  <Badge variant={pricing.isDayRate ? "default" : "secondary"}>
                    {pricing.isDayRate ? "Tariffa giornaliera" : "Tariffa oraria"}
                  </Badge>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Prezzo:</span>
                  <span>€{pricing.basePrice.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
