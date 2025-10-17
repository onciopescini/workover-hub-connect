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
import { CheckoutFiscalFields, type CoworkerFiscalData } from './checkout/CheckoutFiscalFields';
import { coworkerFiscalSchema } from '@/lib/validation/checkoutFiscalSchema';
import { useCoworkerFiscalData } from '@/hooks/useCoworkerFiscalData';
import { fetchOptimizedSpaceAvailability } from "@/lib/availability-rpc";
import { getAvailableCapacity } from "@/lib/capacity-utils";
import { supabase } from "@/integrations/supabase/client";
import { useLogger } from "@/hooks/useLogger";
import { calculateTwoStepBookingPrice } from "@/lib/booking-calculator-utils";
import { computePricing, getServiceFeePct, getDefaultVatPct, isStripeTaxEnabled } from "@/lib/pricing";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { z } from 'zod';

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

export interface TwoStepBookingFormProps {
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
  availability?: any; // Availability configuration from host
  hostFiscalRegime?: string; // Host's fiscal regime to determine if invoice can be requested
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
  availableSpots: number | null;
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
  hostStripeAccountId,
  availability,
  hostFiscalRegime
}: TwoStepBookingFormProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>('DATE');
  const [bookingState, setBookingState] = useState<BookingState>({
    selectedDate: null,
    availableSlots: [],
    selectedRange: null,
    guestsCount: 1,
    availableSpots: null,
    isLoadingSlots: false,
    isReserving: false
  });
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  
  const { info, error, debug } = useLogger({ context: 'TwoStepBookingForm' });
  
  // Fiscal data hook - auto-loads saved data
  const { fiscalData: savedFiscalData, isLoading: isLoadingFiscalData } = useCoworkerFiscalData();
  
  // Fiscal data state for coworker invoice request
  const [requestInvoice, setRequestInvoice] = useState(false);
  const [coworkerFiscalData, setCoworkerFiscalData] = useState<CoworkerFiscalData>({
    tax_id: '',
    is_business: false,
    pec_email: '',
    sdi_code: '',
    billing_address: '',
    billing_city: '',
    billing_province: '',
    billing_postal_code: '',
  });
  const [fiscalErrors, setFiscalErrors] = useState<Record<string, string>>({});
  const [fiscalDataPreFilled, setFiscalDataPreFilled] = useState(false);

  // Pre-fill fiscal data when loaded
  useEffect(() => {
    if (savedFiscalData && !fiscalDataPreFilled) {
      setCoworkerFiscalData(savedFiscalData);
      setFiscalDataPreFilled(true);
      
      info('Fiscal data pre-filled from profile', {
        action: 'fiscal_data_prefilled',
        isBusiness: savedFiscalData.is_business,
        hasAddress: !!savedFiscalData.billing_address
      });
    }
  }, [savedFiscalData, fiscalDataPreFilled, info]);

  const progressValue = {
    'DATE': 33,
    'TIME': 66,
    'SUMMARY': 100
  }[currentStep];

  // Get availability for a specific date
  const getAvailabilityForDate = (date: Date): { enabled: boolean; intervals: { start: string; end: string }[] } => {
    if (!availability) {
      return { enabled: true, intervals: [{ start: "09:00", end: "18:00" }] };
    }

    // Parse/normalize availability if needed
    let parsedAvailability = availability;
    try {
      if (typeof availability === 'string') {
        parsedAvailability = JSON.parse(availability);
      }
    } catch (e) {
      console.warn('Failed to parse availability for date:', e);
      return { enabled: true, intervals: [{ start: "09:00", end: "18:00" }] }; // Fallback default
    }

    if (!parsedAvailability || typeof parsedAvailability !== 'object') {
      return { enabled: true, intervals: [{ start: "09:00", end: "18:00" }] };
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    
    const dateString = format(date, 'yyyy-MM-dd');
    const exception = parsedAvailability.exceptions?.find((ex: any) => ex.date === dateString);
    
    if (exception) {
      // Support both 'enabled' and 'available' fields
      const isEnabled = exception.enabled !== undefined ? exception.enabled : exception.available;
      if (!isEnabled) {
        return { enabled: false, intervals: [] };
      }
      // If exception has slots, use them as intervals
      if (exception.slots && exception.slots.length > 0) {
        return { enabled: true, intervals: exception.slots.map((s: any) => ({ start: s.start, end: s.end })) };
      }
    }
    
    const daySchedule = dayName ? parsedAvailability.recurring?.[dayName] : null;
    if (!daySchedule || !daySchedule.enabled || !daySchedule.slots || daySchedule.slots.length === 0) {
      return { enabled: false, intervals: [] };
    }
    
    // Return all slots as intervals
    return { enabled: true, intervals: daySchedule.slots.map((s: any) => ({ start: s.start, end: s.end })) };
  };

  const generateTimeSlots = (interval: number = 30, date?: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    
    // Default intervals se non c'è availability
    let intervals = [{ start: "08:00", end: "20:00" }];
    
    // Se c'è una data e availability, usiamo gli intervalli configurati
    if (date && availability) {
      const dayAvailability = getAvailabilityForDate(date);
      if (!dayAvailability.enabled || dayAvailability.intervals.length === 0) {
        return [];
      }
      intervals = dayAvailability.intervals;
    }
    
    // Genera slot per ogni intervallo
    for (const intervalConfig of intervals) {
      const [startHour, startMinute] = parseHHMM(intervalConfig.start);
      const [endHour, endMinute] = parseHHMM(intervalConfig.end);
      
      let currentTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
      
      while (currentTime < endTime) {
        slots.push({ 
          time: currentTime, 
          available: true,
          reserved: false,
          selected: false
        });
        currentTime = addMinutesHHMM(currentTime, interval);
      }
    }
    
    return slots;
  };

  const fetchAvailableSlots = async (date: Date) => {
    setBookingState(prev => ({ ...prev, isLoadingSlots: true }));
    
    try {
      debug('Fetching available slots for date', { date: format(date, 'yyyy-MM-dd'), spaceId });
      
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Check if date is available according to host's availability
      const dayAvailability = getAvailabilityForDate(date);
      if (!dayAvailability.enabled) {
        debug('Date not available per host configuration', { date: dateStr, availability: dayAvailability });
        setBookingState(prev => ({ 
          ...prev, 
          availableSlots: [],
          isLoadingSlots: false 
        }));
        return;
      }

      let existingBookings: any[] = [];
      
      try {
        // Try to use optimized RPC first
        existingBookings = await fetchOptimizedSpaceAvailability(spaceId, dateStr, dateStr);
      } catch (rpcError) {
        // Fallback: Query bookings table directly
        error('RPC failed, using fallback query', rpcError as Error, { spaceId, dateStr });
        
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select('id, start_time, end_time, status, user_id')
          .eq('space_id', spaceId)
          .eq('booking_date', dateStr)
          .in('status', ['pending', 'confirmed']);
        
        if (bookingError) {
          throw bookingError;
        }
        
        // Format bookings to match RPC response
        existingBookings = (bookings || []).map(b => ({
          booking_id: b.id,
          start_time: b.start_time ? b.start_time.toString().substring(0, 5) : '00:00', // Extract HH:MM
          end_time: b.end_time ? b.end_time.toString().substring(0, 5) : '00:00',
          status: b.status,
          user_id: b.user_id
        }));
        
        toast.info('Calendario caricato in modalità ridotta');
      }
      
      // Create blocked intervals with buffer
      const interval = slotInterval ?? 30;
      const blocked = existingBookings.map((booking: any) => ({
        start: addMinutesHHMM(booking.start_time, -bufferMinutes),
        end: addMinutesHHMM(booking.end_time, bufferMinutes),
      }));
      
      // Generate base time slots based on availability
      const baseSlots = generateTimeSlots(interval, date);
      
      // Mark unavailable slots based on blocked intervals (including buffer)
      const updatedSlots = baseSlots.map(slot => {
        const isBlocked = blocked.some((block: { start: string; end: string }) => slot.time >= block.start && slot.time < block.end);
        
        return {
          ...slot,
          available: !isBlocked,
          reserved: isBlocked
        };
      });
      
      info('Available slots fetched', { 
        date: dateStr, 
        totalSlots: updatedSlots.length,
        availableSlots: updatedSlots.filter(s => s.available).length,
        usedFallback: existingBookings.length > 0 && !existingBookings[0]?.start_time?.includes(':')
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

  const handleTimeRangeSelect = async (range: SelectedTimeRange) => {
    debug('Time range selected', range);
    
    setBookingState(prev => ({
      ...prev,
      selectedRange: range
    }));

    // Fetch available capacity for the selected time slot
    if (bookingState.selectedDate) {
      const capacity = await getAvailableCapacity(
        spaceId,
        format(bookingState.selectedDate, 'yyyy-MM-dd'),
        range.startTime,
        range.endTime
      );
      
      setBookingState(prev => ({
        ...prev,
        availableSpots: capacity.availableSpots,
        guestsCount: Math.min(prev.guestsCount, capacity.availableSpots) // Adjust guests if needed
      }));

      if (capacity.availableSpots === 0) {
        toast.warning('Attenzione: questo slot è al completo');
      }
    }
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

  const validateFiscalData = (): boolean => {
    if (!requestInvoice) {
      setFiscalErrors({});
      return true;
    }
    
    try {
      coworkerFiscalSchema.parse({
        request_invoice: requestInvoice,
        fiscal_data: coworkerFiscalData,
      });
      setFiscalErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          errors[path] = err.message;
        });
        setFiscalErrors(errors);
        toast.error('Controlla i dati di fatturazione', {
          description: 'Alcuni campi obbligatori sono mancanti o non validi'
        });
      }
      return false;
    }
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

    // Validate fiscal data if invoice is requested
    if (!validateFiscalData()) {
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

      // Calculate client-side base price for server validation
      const durationHours = bookingState.selectedRange.duration;
      const validationPricing = computePricing({
        durationHours,
        pricePerHour,
        pricePerDay,
        serviceFeePct: getServiceFeePct(),
        vatPct: getDefaultVatPct(),
        stripeTaxEnabled: isStripeTaxEnabled()
      });

      debug('Client-side price calculated for validation', {
        durationHours,
        basePrice: validationPricing.base,
        isDayRate: validationPricing.isDayRate
      });

      // Retry logic for critical booking operation
      let data = null;
      let rpcError = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await supabase.rpc('validate_and_reserve_slot', {
          space_id_param: spaceId,
          date_param: format(bookingState.selectedDate, 'yyyy-MM-dd'),
          start_time_param: bookingState.selectedRange.startTime,
          end_time_param: bookingState.selectedRange.endTime,
          user_id_param: user.user.id,
          guests_count_param: bookingState.guestsCount,
          confirmation_type_param: confirmationType,
          client_base_price_param: validationPricing.base // Pass for server-side validation
        } as any);

        data = result.data;
        rpcError = result.error;

        // Success - exit retry loop
        if (!rpcError && data) {
          break;
        }

        // Transient errors - retry
        const isTransientError = rpcError?.code === 'PGRST301' || 
                                  rpcError?.message?.includes('connection');
        
        if (isTransientError && attempt < maxRetries) {
          const delay = 1000 * attempt;
          await new Promise(resolve => setTimeout(resolve, delay));
          debug(`Retrying booking attempt ${attempt + 1}/${maxRetries}`, { spaceId });
          continue;
        }

        // Non-transient error or max retries reached - handle error
        if (rpcError) {
          error('Slot reservation failed', rpcError, { spaceId, bookingState, attempt });
          
          // Handle capacity errors
          if (rpcError.message?.includes('Posti insufficienti') || rpcError.message?.includes('available_spots')) {
            toast.error(
              <>
                ⚠️ Posti insufficienti
                <span data-testid="capacity-error-toast" className="sr-only">capacity-error</span>
              </>, 
              {
                description: rpcError.message || 'Non ci sono abbastanza posti disponibili per questo orario.',
                action: {
                  label: "Aggiorna",
                  onClick: () => {
                    if (bookingState.selectedDate) {
                      fetchAvailableSlots(bookingState.selectedDate);
                      setCurrentStep('TIME');
                    }
                  }
                }
              }
            );
          } else if (rpcError.message?.includes('already booked') || rpcError.message?.includes('conflict')) {
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
      }

      if (!data || typeof data !== 'object') {
        onError('Errore nella prenotazione');
        return;
      }

      const responseData = data as { 
        success?: boolean; 
        error?: string; 
        booking_id?: string;
        confirmation_type?: string;
        initial_status?: string;
      };

      if (!responseData.success) {
        onError(responseData.error || 'Errore nella prenotazione');
        return;
      }

      info('Slot reserved successfully', { 
        bookingId: responseData.booking_id,
        confirmationType: responseData.confirmation_type,
        initialStatus: responseData.initial_status
      });
      
      // Handle host_approval flow (no immediate payment)
      if (responseData.confirmation_type === 'host_approval') {
        toast.success('Richiesta di prenotazione inviata!', {
          description: 'L\'host riceverà la tua richiesta e ti risponderà entro le tempistiche previste.',
          duration: 5000
        });
        
        // Redirect to bookings page after 2 seconds
        setTimeout(() => {
          onSuccess();
        }, 2000);
        
        return; // Do not proceed with payment for host_approval
      }
      
      // For instant bookings, proceed with payment
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

      // Prepare fiscal data for payment session
      const fiscalMetadata = requestInvoice ? {
        request_invoice: true,
        ...coworkerFiscalData
      } : null;

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
            fiscal_data: fiscalMetadata,
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
          error('Pricing mismatch detected', new Error('Client/Server pricing mismatch'), {
            client: { total: clientTotal, pricing },
            server: { total: serverTotal, totals: sessionData.serverTotals },
            difference: Math.abs(clientTotal - serverTotal)
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
            availability={availability}
          />
        )}
        
        {currentStep === 'TIME' && (
          <div className="space-y-6">
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
            
            {bookingState.selectedRange && (
              <GuestsSelector
                guestsCount={bookingState.guestsCount}
                maxCapacity={maxCapacity}
                onGuestsChange={handleGuestsChange}
                availableSpots={bookingState.availableSpots ?? maxCapacity}
              />
            )}
          </div>
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
            
            {/* Fiscal Fields for Invoice Request */}
            {hostFiscalRegime && hostFiscalRegime !== 'privato' && (
              <CheckoutFiscalFields
                requestInvoice={requestInvoice}
                onToggleInvoice={setRequestInvoice}
                fiscalData={coworkerFiscalData}
                onFiscalDataChange={setCoworkerFiscalData}
                hostHasVat={hostFiscalRegime !== 'privato'}
                errors={fiscalErrors}
                isPreFilled={fiscalDataPreFilled}
              />
            )}
            
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