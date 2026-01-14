import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";
import { useCheckout } from '@/hooks/useCheckout';
import { useCoworkerFiscalData } from '@/hooks/useCoworkerFiscalData';
import { fetchOptimizedSpaceAvailability } from "@/lib/availability-rpc";
import { getAvailableCapacity } from "@/lib/capacity-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { coworkerFiscalSchema } from '@/lib/validation/checkoutFiscalSchema';
import { computePricing } from "@/lib/pricing";
import { TwoStepBookingForm, BookingStep, BookingState, SelectedTimeRange, TimeSlot } from "../booking/TwoStepBookingForm";
import type { CoworkerFiscalData } from '@/components/booking/checkout/CheckoutFiscalFields';

// Helper functions
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

interface BookingFormProps {
  spaceId: string;
  pricePerDay: number;
  pricePerHour?: number;
  confirmationType: string;
  maxCapacity: number;
  cancellationPolicy?: string;
  rules?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  hostStripeAccountId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availability?: any;
  authorId?: string;
  minBookingHours?: number;
  timezone?: string;
  bufferMinutes?: number;
  slotInterval?: number;
  hostFiscalRegime?: string;
}

export function BookingForm({
  spaceId,
  pricePerDay,
  pricePerHour: pricePerHourProp,
  confirmationType,
  maxCapacity,
  cancellationPolicy,
  rules,
  onSuccess,
  onError,
  hostStripeAccountId,
  availability,
  timezone,
  bufferMinutes = 0,
  slotInterval = 30,
  hostFiscalRegime
}: BookingFormProps) {
  // Default values
  const pricePerHour = pricePerHourProp || pricePerDay / 8;
  const effectiveTimezone = timezone || 'Europe/Rome';

  // State
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

  // Fiscal Data State
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

  // Hooks
  const { info, error, debug } = useLogger({ context: 'BookingForm' });
  const { processCheckout, isLoading: isCheckoutLoading } = useCheckout();
  const { fiscalData: savedFiscalData } = useCoworkerFiscalData();

  // Effects
  useEffect(() => {
    if (savedFiscalData && !fiscalDataPreFilled) {
      setCoworkerFiscalData(savedFiscalData);
      setFiscalDataPreFilled(true);
      info('Fiscal data pre-filled from profile');
    }
  }, [savedFiscalData, fiscalDataPreFilled, info]);

  // Logic Helpers
  const getAvailabilityForDate = (date: Date): { enabled: boolean; intervals: { start: string; end: string }[] } => {
    if (!availability) {
      return { enabled: true, intervals: [{ start: "09:00", end: "18:00" }] };
    }

    let parsedAvailability = availability;
    try {
      if (typeof availability === 'string') {
        parsedAvailability = JSON.parse(availability);
      }
    } catch (e) {
      console.warn('Failed to parse availability for date:', e);
      return { enabled: true, intervals: [{ start: "09:00", end: "18:00" }] };
    }

    if (!parsedAvailability || typeof parsedAvailability !== 'object') {
      return { enabled: true, intervals: [{ start: "09:00", end: "18:00" }] };
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];

    const dateString = format(date, 'yyyy-MM-dd');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exception = parsedAvailability.exceptions?.find((ex: any) => ex.date === dateString);

    if (exception) {
      const isEnabled = exception.enabled !== undefined ? exception.enabled : exception.available;
      if (!isEnabled) {
        return { enabled: false, intervals: [] };
      }
      if (exception.slots && exception.slots.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { enabled: true, intervals: exception.slots.map((s: any) => ({ start: s.start, end: s.end })) };
      }
    }

    const daySchedule = dayName ? parsedAvailability.recurring?.[dayName] : null;
    if (!daySchedule || !daySchedule.enabled || !daySchedule.slots || daySchedule.slots.length === 0) {
      return { enabled: false, intervals: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { enabled: true, intervals: daySchedule.slots.map((s: any) => ({ start: s.start, end: s.end })) };
  };

  const generateTimeSlots = (interval: number, date?: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    let intervals = [{ start: "08:00", end: "20:00" }];

    if (date && availability) {
      const dayAvailability = getAvailabilityForDate(date);
      if (!dayAvailability.enabled || dayAvailability.intervals.length === 0) {
        return [];
      }
      intervals = dayAvailability.intervals;
    }

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
      debug('Fetching available slots', { date: format(date, 'yyyy-MM-dd'), spaceId });
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayAvailability = getAvailabilityForDate(date);
      if (!dayAvailability.enabled) {
        setBookingState(prev => ({ ...prev, availableSlots: [], isLoadingSlots: false }));
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let existingBookings: any[] = [];

      try {
        existingBookings = await fetchOptimizedSpaceAvailability(spaceId, dateStr, dateStr);
      } catch (rpcError) {
        error('RPC failed, using fallback', rpcError as Error);
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select('id, start_time, end_time, status, user_id')
          .eq('space_id', spaceId)
          .eq('booking_date', dateStr)
          .in('status', ['pending', 'confirmed']);

        if (bookingError) throw bookingError;

        existingBookings = (bookings || []).map(b => ({
          booking_id: b.id,
          start_time: b.start_time ? b.start_time.toString().substring(0, 5) : '00:00',
          end_time: b.end_time ? b.end_time.toString().substring(0, 5) : '00:00',
          status: b.status,
          user_id: b.user_id
        }));
      }

      const interval = slotInterval;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blocked = existingBookings.map((booking: any) => ({
        start: addMinutesHHMM(booking.start_time, -bufferMinutes),
        end: addMinutesHHMM(booking.end_time, bufferMinutes),
      }));

      const baseSlots = generateTimeSlots(interval, date);

      const now = new Date();
      let zonedNow: Date;
      try {
        zonedNow = toZonedTime(now, effectiveTimezone);
      } catch (e) {
        console.warn('Invalid timezone', effectiveTimezone, e);
        zonedNow = now;
      }

      const isToday = format(date, 'yyyy-MM-dd') === format(zonedNow, 'yyyy-MM-dd');
      const currentHH = zonedNow.getHours();
      const currentMM = zonedNow.getMinutes();

      const updatedSlots = baseSlots.map(slot => {
        const isBlocked = blocked.some((block: { start: string; end: string }) => slot.time >= block.start && slot.time < block.end);

        let isPastTime = false;
        if (isToday) {
          const [slotHH, slotMM] = parseHHMM(slot.time);
          if (slotHH < currentHH || (slotHH === currentHH && slotMM <= currentMM)) {
            isPastTime = true;
          }
        }

        return {
          ...slot,
          available: !isBlocked && !isPastTime,
          reserved: isBlocked
        };
      });

      setBookingState(prev => ({
        ...prev,
        availableSlots: updatedSlots,
        isLoadingSlots: false
      }));

    } catch (err) {
      error('Failed to fetch slots', err as Error);
      toast.error('Errore nel caricamento degli slot');
      setBookingState(prev => ({ ...prev, isLoadingSlots: false }));
    }
  };

  // Handlers
  const handleDateSelect = async (date: Date) => {
    setBookingState(prev => ({
      ...prev,
      selectedDate: date,
      selectedRange: null,
      availableSlots: []
    }));
    await fetchAvailableSlots(date);
    setCurrentStep('TIME');
  };

  const handleTimeRangeSelect = async (range: SelectedTimeRange) => {
    setBookingState(prev => ({ ...prev, selectedRange: range }));
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
        guestsCount: Math.max(1, Math.min(prev.guestsCount, capacity.availableSpots))
      }));
    }
  };

  const handleGuestsChange = (count: number) => {
    setBookingState(prev => ({ ...prev, guestsCount: Math.max(1, count) }));
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
        toast.error('Controlla i dati di fatturazione');
      }
      return false;
    }
  };

  const handleConfirmBooking = async () => {
    if (!navigator.onLine) {
      toast.error('Nessuna connessione internet');
      return;
    }
    if (!bookingState.selectedDate || !bookingState.selectedRange) {
      toast.error('Completa tutti i passaggi');
      return;
    }
    if (!acceptedPolicy && (cancellationPolicy || rules)) {
      toast.error('Accetta le policy per continuare');
      return;
    }
    if (!validateFiscalData()) return;

    setBookingState(prev => ({ ...prev, isReserving: true }));

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        onError('Devi essere autenticato per prenotare');
        return;
      }

      const fiscalMetadata = requestInvoice ? {
        request_invoice: true,
        ...coworkerFiscalData
      } : null;

      const durationHours = bookingState.selectedRange.duration;
      const validationPricing = computePricing({
        durationHours,
        pricePerHour,
        pricePerDay,
        guestsCount: bookingState.guestsCount
      });

      const result = await processCheckout({
        spaceId,
        userId: user.user.id,
        date: bookingState.selectedDate,
        startTime: bookingState.selectedRange.startTime,
        endTime: bookingState.selectedRange.endTime,
        guestsCount: bookingState.guestsCount,
        confirmationType: confirmationType as 'instant' | 'host_approval',
        pricePerHour,
        pricePerDay,
        durationHours: bookingState.selectedRange.duration,
        ...(hostStripeAccountId ? { hostStripeAccountId } : {}),
        fiscalData: fiscalMetadata,
        clientBasePrice: validationPricing.base
      });

      if (!result.success) {
        if (result.error?.includes('Insert failed')) {
           toast.error('Errore Database', { description: result.error });
        } else if (result.error?.includes('Posti insufficienti')) {
           toast.error('Posti insufficienti');
        } else if (result.error?.includes('conflict')) {
           toast.error('Slot non più disponibile');
        } else {
           const errorMsg = result.error || 'Errore durante la prenotazione';
           toast.error('Errore prenotazione', { description: errorMsg });
           onError(errorMsg);
        }
        return;
      }

      if (confirmationType === 'host_approval') {
        toast.success('Richiesta inviata!');
        setTimeout(onSuccess, 2000);
      }

    } catch (err) {
      error('Unexpected error', err as Error);
      onError('Errore imprevisto');
    } finally {
      setBookingState(prev => ({ ...prev, isReserving: false }));
    }
  };

  return (
    <TwoStepBookingForm
      // Config
      spaceId={spaceId}
      pricePerDay={pricePerDay}
      pricePerHour={pricePerHour}
      confirmationType={confirmationType}
      maxCapacity={maxCapacity}
      cancellationPolicy={cancellationPolicy}
      rules={rules}
      bufferMinutes={bufferMinutes}
      slotInterval={slotInterval}
      hostStripeAccountId={hostStripeAccountId}
      availability={availability}
      hostFiscalRegime={hostFiscalRegime}
      timezone={effectiveTimezone}

      // State
      currentStep={currentStep}
      bookingState={bookingState}
      acceptedPolicy={acceptedPolicy}
      requestInvoice={requestInvoice}
      coworkerFiscalData={coworkerFiscalData}
      fiscalErrors={fiscalErrors}
      isReserving={bookingState.isReserving}
      isCheckoutLoading={isCheckoutLoading}
      fiscalDataPreFilled={fiscalDataPreFilled}

      // Handlers
      onDateSelect={handleDateSelect}
      onRangeSelect={handleTimeRangeSelect}
      onGuestsChange={handleGuestsChange}
      onStepChange={setCurrentStep}
      onConfirm={handleConfirmBooking}
      setAcceptedPolicy={setAcceptedPolicy}
      setRequestInvoice={setRequestInvoice}
      setCoworkerFiscalData={setCoworkerFiscalData}
    />
  );
}
