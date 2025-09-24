import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Calendar, Clock, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DateSelectionStep } from "./DateSelectionStep";
import { TimeSlotSelectionStep } from "./TimeSlotSelectionStep";
import { BookingSummaryStep } from "./BookingSummaryStep";
import { GuestsSelector } from './GuestsSelector';
import { PolicyDisplay } from '../spaces/PolicyDisplay';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchOptimizedSpaceAvailability } from "@/lib/availability-rpc";
import { supabase } from "@/integrations/supabase/client";
import { useLogger } from "@/hooks/useLogger";
import { calculateTwoStepBookingPrice } from "@/lib/booking-calculator-utils";
import { computePricing, getServiceFeePct, getDefaultVatPct, isStripeTaxEnabled } from "@/lib/pricing";
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
  maxCapacity: number;
  cancellationPolicy?: string;
  rules?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  bufferMinutes?: number;
  slotInterval?: number; // 15 or 30 minutes
  hostStripeAccountId?: string; // Optional for Stripe Connect payments
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
  guestsCount: number;
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
  maxCapacity,
  cancellationPolicy = 'moderate',
  rules,
  onSuccess, 
  onError,
  bufferMinutes = 0,
  slotInterval = 30,
  hostStripeAccountId
}: TwoStepBookingFormProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>('DATE');
  const [bookingState, setBookingState] = useState<BookingState>({
    selectedDate: null,
    availableSlots: [],
    selectedRange: null,
    guestsCount: 1,
    isLoadingSlots: false,
    isReserving: false
  });
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

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
      const baseSlots = generateTimeSlots(interval);
      
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

  const handleGuestsChange = (count: number) => {
    setBookingState(prev => ({
      ...prev,
      guestsCount: count
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

    if (!acceptedPolicy && (cancellationPolicy || rules)) {
      toast.error('Devi accettare le policy e regole per continuare');
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
        guests_count_param: bookingState.guestsCount,
        confirmation_type_param: confirmationType
      } as any);

      if (rpcError) {
        error('Slot reservation failed', rpcError, { spaceId, bookingState });
        
        if (rpcError.message?.includes('already booked') || rpcError.message?.includes('conflict')) {
          toast.error(
            <>
              ⚠️ Slot non più disponibile
              <span data-testid="lock-error-toast" className="sr-only">lock-error</span>
            </>, 
            {
              description: (
                <>
                  Qualcun altro ha prenotato questo orario. Seleziona un altro slot.
                </>
              ),
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
      
      // Check if host has Stripe account configured
      if (!hostStripeAccountId) {
        toast.error('Host non collegato a Stripe', {
          description: 'Impossibile procedere con il pagamento. Contatta il proprietario dello spazio.'
        });
        return;
      }

      // Calculate pricing for Stripe payment
      const pricing = computePricing({
        durationHours: bookingState.selectedRange.duration,
        pricePerHour,
        pricePerDay,
        serviceFeePct: getServiceFeePct(),
        vatPct: getDefaultVatPct(),
        stripeTaxEnabled: isStripeTaxEnabled()
      });

      debug('Creating Stripe payment session', { 
        pricing, 
        bookingId: responseData.booking_id,
        hostStripeAccountId 
      });

      // Create Stripe Checkout session
      const { data: sessionData, error: fnError } = await supabase.functions.invoke(
        'create-payment-session',
        {
          body: {
            space_id: spaceId,
            booking_id: responseData.booking_id,
            durationHours: bookingState.selectedRange.duration,
            pricePerHour,
            pricePerDay,
            host_stripe_account_id: hostStripeAccountId,
          }
        }
      );

      if (fnError || !sessionData?.url) {
        error('Payment session creation failed', fnError, { spaceId, bookingState });
        toast.error('Errore nella creazione della sessione di pagamento', {
          description: (
            <>
              Impossibile procedere con il pagamento
              <span data-testid="payment-error-toast" className="sr-only">payment-error</span>
            </>
          ),
        });
        return;
      }

      // Log pricing comparison for debugging (non-blocking)
      if (sessionData.serverTotals) {
        const clientTotal = pricing.total;
        const serverTotal = sessionData.serverTotals.total;
        if (Math.abs(clientTotal - serverTotal) > 0.01) {
          console.warn('Pricing mismatch detected:', {
            client: { total: clientTotal, pricing },
            server: { total: serverTotal, totals: sessionData.serverTotals }
          });
        }
      }

      info('Payment session created successfully', { 
        sessionUrl: sessionData.url,
        serverTotals: sessionData.serverTotals
      });

      toast.success('Slot riservato! Reindirizzamento al pagamento...', {
        icon: <CheckCircle className="w-4 h-4" />
      });

      // Redirect to Stripe Checkout
      setTimeout(() => {
        window.location.href = sessionData.url;
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
          <>
            <BookingSummaryStep
              selectedDate={bookingState.selectedDate!}
              selectedRange={bookingState.selectedRange!}
              pricePerHour={pricePerHour}
              pricePerDay={pricePerDay}
              confirmationType={confirmationType}
              guestsCount={bookingState.guestsCount}
            />
            
            {/* Policy and Rules Display */}
            {(cancellationPolicy || rules) && (
              <div className="mt-6">
                <PolicyDisplay 
                  cancellationPolicy={cancellationPolicy}
                  rules={rules || ''}
                />
                
                {/* Policy Acceptance */}
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="accept-policy"
                      checked={acceptedPolicy}
                      onCheckedChange={(checked: boolean) => setAcceptedPolicy(checked)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="accept-policy"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Accetto le policy di cancellazione e le regole della casa
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confermo di aver letto e accettato le condizioni di prenotazione
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          {canGoBack && (
            <Button
              type="button"
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
              type="button"
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
              type="button"
              onClick={handleContinueToSummary}
              disabled={!canContinue}
            >
              Continua
            </Button>
          )}
          
          {currentStep === 'SUMMARY' && (
            <>
              {!hostStripeAccountId && (
                <div className="text-sm text-muted-foreground mb-2 text-center">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Host non collegato a Stripe
                </div>
              )}
              <Button
                type="button"
                onClick={handleConfirmBooking}
                disabled={bookingState.isReserving || !hostStripeAccountId}
                className="min-w-32"
              >
                {bookingState.isReserving ? (
                  <>
                    <span data-testid="checkout-loading-spinner" className="sr-only">loading</span>
                    Prenotando...
                  </>
                ) : (
                  <>Conferma</>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}