import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Calendar, Clock, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DateSelectionStep } from "./DateSelectionStep";
import { TimeSlotSelectionStep } from "./TimeSlotSelectionStep";
import { BookingSummaryStep } from "./BookingSummaryStep";
import { fetchOptimizedSpaceAvailability } from "@/lib/availability-rpc";
import { supabase } from "@/integrations/supabase/client";
import { useLogger } from "@/hooks/useLogger";
import { calculateTwoStepBookingPrice } from "@/lib/booking-calculator-utils";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Helper functions for time calculations
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

interface TwoStepBookingFormProps {
  spaceId: string;
  pricePerDay: number;
  pricePerHour: number;
  confirmationType: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  bufferMinutes?: number;
  slotInterval?: number; // 15 or 30 minutes
}

export type BookingStep = 'DATE' | 'TIME' | 'SUMMARY';

export interface TimeSlot {
  time: string;
  available: boolean;
  reserved?: boolean;
  selected?: boolean;
}

export interface SelectedTimeRange {
  startTime: string;
  endTime: string;
  duration: number; // in hours
}

export interface BookingState {
  selectedDate: Date | null;
  availableSlots: TimeSlot[];
  selectedRange: SelectedTimeRange | null;
  isLoadingSlots: boolean;
  isReserving: boolean;
}

const STEP_CONFIG = [
  { key: 'DATE', label: 'Data', icon: Calendar },
  { key: 'TIME', label: 'Orario', icon: Clock },
  { key: 'SUMMARY', label: 'Riepilogo', icon: CreditCard }
] as const;

export function TwoStepBookingForm({ 
  spaceId, 
  pricePerDay, 
  pricePerHour,
  confirmationType, 
  onSuccess, 
  onError,
  bufferMinutes = 0,
  slotInterval = 30
}: TwoStepBookingFormProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>('DATE');
  const [bookingState, setBookingState] = useState<BookingState>({
    selectedDate: null,
    availableSlots: [],
    selectedRange: null,
    isLoadingSlots: false,
    isReserving: false
  });

  const { info, error, debug } = useLogger({ context: 'TwoStepBookingForm' });

  const progressValue = {
    'DATE': 33,
    'TIME': 66,
    'SUMMARY': 100
  }[currentStep];

  const generateTimeSlots = (interval: number = 30): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 8; // 8:00
    const endHour = 20; // 20:00
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time,
          available: true,
          reserved: false,
          selected: false
        });
      }
    }
    
    return slots;
  };

  const fetchAvailableSlots = async (date: Date) => {
    setBookingState(prev => ({ ...prev, isLoadingSlots: true }));
    
    try {
      debug('Fetching available slots for date', { date: format(date, 'yyyy-MM-dd'), spaceId });
      
      const dateStr = format(date, 'yyyy-MM-dd');
      const availability = await fetchOptimizedSpaceAvailability(spaceId, dateStr, dateStr);
      
      // Create blocked intervals with buffer
      const interval = slotInterval ?? 30;
      const blocked = availability.map((booking: any) => ({
        start: addMinutesHHMM(booking.start_time, -bufferMinutes),
        end: addMinutesHHMM(booking.end_time, bufferMinutes),
      }));
      
      // Generate base time slots
      const baseSlots = generateTimeSlots(slotInterval);
      
      // Mark unavailable slots based on blocked intervals (including buffer)
      const updatedSlots = baseSlots.map(slot => {
        const isBlocked = blocked.some(({start, end}) => slot.time >= start && slot.time < end);
        
        return {
          ...slot,
          available: !isBlocked,
          reserved: isBlocked
        };
      });
      
      info('Available slots fetched', { 
        date: dateStr, 
        totalSlots: updatedSlots.length,
        availableSlots: updatedSlots.filter(s => s.available).length
      });
      
      setBookingState(prev => ({
        ...prev,
        availableSlots: updatedSlots,
        isLoadingSlots: false
      }));
      
    } catch (err) {
      error('Failed to fetch available slots', err as Error, { spaceId, date });
      toast.error('Errore nel caricamento degli slot disponibili');
      setBookingState(prev => ({ ...prev, isLoadingSlots: false }));
    }
  };

  const handleDateSelect = async (date: Date) => {
    debug('Date selected', { date: format(date, 'yyyy-MM-dd') });
    
    setBookingState(prev => ({
      ...prev,
      selectedDate: date,
      selectedRange: null, // Reset time selection
      availableSlots: []
    }));
    
    await fetchAvailableSlots(date);
    setCurrentStep('TIME');
  };

  const handleTimeRangeSelect = (range: SelectedTimeRange) => {
    debug('Time range selected', range);
    
    setBookingState(prev => ({
      ...prev,
      selectedRange: range
    }));
  };

  const handleContinueToSummary = () => {
    if (!bookingState.selectedRange) {
      toast.error('Seleziona un orario per continuare');
      return;
    }
    
    setCurrentStep('SUMMARY');
  };

  const handleConfirmBooking = async () => {
    if (!bookingState.selectedDate || !bookingState.selectedRange) {
      toast.error('Completa tutti i passaggi prima di confermare');
      return;
    }

    setBookingState(prev => ({ ...prev, isReserving: true }));

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        onError('Devi essere autenticato per prenotare');
        return;
      }

      debug('Attempting to reserve slot with lock', {
        spaceId,
        date: format(bookingState.selectedDate, 'yyyy-MM-dd'),
        startTime: bookingState.selectedRange.startTime,
        endTime: bookingState.selectedRange.endTime
      });

      const { data, error: rpcError } = await supabase.rpc('validate_and_reserve_slot', {
        space_id_param: spaceId,
        date_param: format(bookingState.selectedDate, 'yyyy-MM-dd'),
        start_time_param: bookingState.selectedRange.startTime,
        end_time_param: bookingState.selectedRange.endTime,
        user_id_param: user.user.id,
        confirmation_type_param: confirmationType
      });

      if (rpcError) {
        error('Slot reservation failed', rpcError, { spaceId, bookingState });
        
        if (rpcError.message?.includes('already booked') || rpcError.message?.includes('conflict')) {
          toast.error(
            <>
              ⚠️ Slot non più disponibile
              <span data-testid="lock-error-toast" className="sr-only">lock-error</span>
            </>, 
            {
              description: "Qualcun altro ha prenotato questo orario. Seleziona un altro slot.",
              action: {
                label: "Aggiorna",
                onClick: () => {
                  if (bookingState.selectedDate) {
                    fetchAvailableSlots(bookingState.selectedDate);
                    setCurrentStep('TIME');
                  }
                }
              },
              duration: 5000
            }
          );
        } else {
          onError('Errore nella prenotazione: ' + rpcError.message);
        }
        return;
      }

      if (!data || typeof data !== 'object') {
        onError('Errore nella prenotazione');
        return;
      }

      const responseData = data as { success?: boolean; error?: string; booking_id?: string };

      if (!responseData.success) {
        onError(responseData.error || 'Errore nella prenotazione');
        return;
      }

      info('Slot reserved successfully', { bookingId: responseData.booking_id });
      
      // Calculate final price for payment
      const pricing = calculateTwoStepBookingPrice(
        bookingState.selectedRange.duration,
        pricePerHour,
        pricePerDay
      );

      toast.success('Slot riservato! Reindirizzamento al pagamento...', {
        icon: <CheckCircle className="w-4 h-4" />
      });

      // For now, we'll call onSuccess - in a real implementation this would trigger payment flow
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err) {
      error('Unexpected error during booking', err as Error, { spaceId, bookingState });
      onError('Errore imprevisto nella prenotazione');
    } finally {
      setBookingState(prev => ({ ...prev, isReserving: false }));
    }
  };

  const canGoBack = currentStep !== 'DATE';
  const canContinue = {
    'DATE': bookingState.selectedDate !== null,
    'TIME': bookingState.selectedRange !== null,
    'SUMMARY': true
  }[currentStep];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {confirmationType === 'instant' ? 'Prenota Subito' : 'Richiedi Prenotazione'}
        </CardTitle>
        
        {/* Breadcrumb Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            {STEP_CONFIG.map((step, index) => (
              <div 
                key={step.key}
                className={`flex items-center gap-2 ${
                  currentStep === step.key ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
                aria-current={currentStep === step.key ? 'step' : undefined}
              >
                <step.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            ))}
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step Content */}
        {currentStep === 'DATE' && (
          <DateSelectionStep
            selectedDate={bookingState.selectedDate}
            onDateSelect={handleDateSelect}
            spaceId={spaceId}
          />
        )}
        
        {currentStep === 'TIME' && (
          <TimeSlotSelectionStep
            selectedDate={bookingState.selectedDate!}
            availableSlots={bookingState.availableSlots}
            selectedRange={bookingState.selectedRange}
            onRangeSelect={handleTimeRangeSelect}
            isLoading={bookingState.isLoadingSlots}
            pricePerHour={pricePerHour}
            pricePerDay={pricePerDay}
            bufferMinutes={bufferMinutes}
            slotInterval={slotInterval}
          />
        )}
        
        {currentStep === 'SUMMARY' && (
          <BookingSummaryStep
            selectedDate={bookingState.selectedDate!}
            selectedRange={bookingState.selectedRange!}
            pricePerHour={pricePerHour}
            pricePerDay={pricePerDay}
            confirmationType={confirmationType}
          />
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          {canGoBack && (
            <Button
              variant="outline"
              onClick={() => {
                const prevStep = {
                  'TIME': 'DATE',
                  'SUMMARY': 'TIME'
                }[currentStep] as BookingStep;
                setCurrentStep(prevStep);
              }}
              disabled={bookingState.isReserving}
            >
              Indietro
            </Button>
          )}
          
          <div className="flex-1" />
          
          {currentStep === 'DATE' && (
            <Button
              onClick={() => {
                if (bookingState.selectedDate) {
                  setCurrentStep('TIME');
                }
              }}
              disabled={!canContinue}
              data-testid="date-step-continue"
            >
              Continua
            </Button>
          )}
          
          {currentStep === 'TIME' && (
            <Button
              onClick={handleContinueToSummary}
              disabled={!canContinue}
            >
              Continua
            </Button>
          )}
          
          {currentStep === 'SUMMARY' && (
            <Button
              onClick={handleConfirmBooking}
              disabled={bookingState.isReserving}
              className="min-w-32"
            >
              {bookingState.isReserving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Prenotando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Conferma
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}