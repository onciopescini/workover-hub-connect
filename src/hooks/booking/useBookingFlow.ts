import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";
import { useCheckout } from '@/hooks/checkout/useCheckout';
import { fetchOptimizedSpaceAvailability } from "@/lib/availability-rpc";
import { getAvailableCapacity } from "@/lib/capacity-utils";
import { computePricing } from "@/lib/pricing";
import { BookingState, SelectedTimeRange, BookingStep } from "@/components/booking-wizard/TwoStepBookingForm";
import type { BookingTimeSlot } from "@/types/booking-slots";
import type { AvailabilityData, AvailabilityException, TimeSlot as AvailTimeSlot } from "@/types/availability";
import type { CoworkerFiscalData } from '@/types/booking';

// Helper functions (could be moved to utils)
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

interface ExistingBookingEntry {
  booking_id?: string;
  start_time: string;
  end_time: string;
  status?: string;
  user_id?: string;
}

const isExistingBookingEntry = (value: unknown): value is ExistingBookingEntry => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return typeof record.start_time === 'string' && typeof record.end_time === 'string';
};

export interface UseBookingFlowProps {
  spaceId: string;
  pricePerDay: number;
  pricePerHour?: number;
  confirmationType: string;
  maxCapacity: number;
  hostStripeAccountId?: string;
  availability?: AvailabilityData | string; // Allow string for legacy/raw data
  timezone?: string;
  bufferMinutes?: number;
  slotInterval?: number;
  cancellationPolicy?: string;
  rules?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  userId?: string;
}

export interface UseBookingFlowResult {
  currentStep: BookingStep;
  setCurrentStep: Dispatch<SetStateAction<BookingStep>>;
  bookingState: BookingState;
  setBookingState: Dispatch<SetStateAction<BookingState>>;
  acceptedPolicy: boolean;
  setAcceptedPolicy: Dispatch<SetStateAction<boolean>>;
  requestInvoice: boolean;
  setRequestInvoice: Dispatch<SetStateAction<boolean>>;
  coworkerFiscalData: CoworkerFiscalData;
  setCoworkerFiscalData: Dispatch<SetStateAction<CoworkerFiscalData>>;
  fiscalErrors: Record<string, string>;
  setFiscalErrors: Dispatch<SetStateAction<Record<string, string>>>;
  fiscalDataPreFilled: boolean;
  setFiscalDataPreFilled: Dispatch<SetStateAction<boolean>>;
  isCheckoutLoading: boolean;
  handleDateSelect: (date: Date) => Promise<void>;
  handleTimeRangeSelect: (range: SelectedTimeRange) => Promise<void>;
  handleConfirmBooking: (validateFiscalData: () => boolean, user: { id: string } | null) => Promise<void>;
  pricePerHour: number;
}

export function useBookingFlow({
  spaceId,
  pricePerDay,
  pricePerHour: pricePerHourProp,
  confirmationType,
  hostStripeAccountId,
  availability,
  timezone = 'Europe/Rome',
  bufferMinutes = 0,
  slotInterval = 30,
  cancellationPolicy,
  rules,
  onSuccess,
  onError,
  userId
}: UseBookingFlowProps): UseBookingFlowResult {
  const pricePerHour = pricePerHourProp || pricePerDay / 8;
  const { info, error: logError, debug } = useLogger({ context: 'useBookingFlow' });
  const { processCheckout, isLoading: isCheckoutLoading } = useCheckout();

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

  // Logic Helpers
  const getAvailabilityForDate = useCallback((date: Date): { enabled: boolean; intervals: { start: string; end: string }[] } => {
    // Default fallback
    if (!availability) {
      return { enabled: true, intervals: [{ start: "09:00", end: "18:00" }] };
    }

    let parsedAvailability: AvailabilityData | null = null;

    // Strict type check and parsing
    if (typeof availability === 'string') {
      try {
        parsedAvailability = JSON.parse(availability) as AvailabilityData;
      } catch (e) {
        logError('Failed to parse availability JSON', e as Error);
        return { enabled: true, intervals: [{ start: "09:00", end: "18:00" }] };
      }
    } else {
      parsedAvailability = availability as AvailabilityData;
    }

    if (!parsedAvailability || typeof parsedAvailability !== 'object') {
      return { enabled: true, intervals: [{ start: "09:00", end: "18:00" }] };
    }

    const dayNames: (keyof typeof parsedAvailability.recurring)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    const dateString = format(date, 'yyyy-MM-dd');

    // Check exceptions first
    const exception = parsedAvailability.exceptions?.find((ex) => ex.date === dateString);

    if (exception) {
      type AvailabilityExceptionLegacy = AvailabilityException & { available?: boolean };
      const legacyException = exception as AvailabilityExceptionLegacy;
      const isEnabled = typeof legacyException.enabled === 'boolean'
        ? legacyException.enabled
        : legacyException.available ?? true;

      if (!isEnabled) {
        return { enabled: false, intervals: [] };
      }
      if (exception.slots && exception.slots.length > 0) {
        return { enabled: true, intervals: exception.slots.map((s: AvailTimeSlot) => ({ start: s.start, end: s.end })) };
      }
    }

    // Check recurring schedule
    const daySchedule = dayName ? parsedAvailability.recurring?.[dayName] : null;
    if (!daySchedule || !daySchedule.enabled || !daySchedule.slots || daySchedule.slots.length === 0) {
      return { enabled: false, intervals: [] };
    }

    return { enabled: true, intervals: daySchedule.slots.map((s: AvailTimeSlot) => ({ start: s.start, end: s.end })) };
  }, [availability, logError]);


  const generateTimeSlots = useCallback((interval: number, date?: Date): BookingTimeSlot[] => {
    const slots: BookingTimeSlot[] = [];
    let intervals = [{ start: "08:00", end: "20:00" }];

    if (date) {
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

      // Safety break to prevent infinite loops if bad data
      let safetyCounter = 0;
      while (currentTime < endTime && safetyCounter < 100) {
        slots.push({
          time: currentTime,
          available: true,
          reserved: false,
          selected: false
        });
        currentTime = addMinutesHHMM(currentTime, interval);
        safetyCounter++;
      }
    }

    return slots;
  }, [getAvailabilityForDate]);

  const fetchAvailableSlots = useCallback(async (date: Date) => {
    setBookingState(prev => ({ ...prev, isLoadingSlots: true }));

    try {
      debug('Fetching available slots', { date: format(date, 'yyyy-MM-dd'), spaceId });
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayAvailability = getAvailabilityForDate(date);
      if (!dayAvailability.enabled) {
        setBookingState(prev => ({ ...prev, availableSlots: [], isLoadingSlots: false }));
        return;
      }

      let existingBookings: ExistingBookingEntry[] = [];

      const rpcBookings = await fetchOptimizedSpaceAvailability(spaceId, dateStr, dateStr);
      existingBookings = Array.isArray(rpcBookings)
        ? rpcBookings.filter(isExistingBookingEntry)
        : [];

      // Filter user's existing bookings to prevent double booking
      if (userId) {
        try {
          const { data: userBookings, error: userBookingsError } = await supabase
            .from('bookings')
            .select('start_time, end_time, status')
            .eq('space_id', spaceId)
            .eq('user_id', userId)
            .eq('booking_date', dateStr)
            .in('status', ['confirmed', 'pending_approval', 'pending_payment']);

          if (userBookingsError) {
            logError('Failed to fetch user bookings', userBookingsError);
          } else if (userBookings && userBookings.length > 0) {
            // Add user bookings to existing bookings to block them
            const formattedUserBookings: ExistingBookingEntry[] = userBookings
              .map(b => {
                if (!b.start_time || !b.end_time) return null;

                // Convert ISO timestamp to HH:mm in the space's timezone
                // Because existingBookings expects time strings, not ISO dates
                const startD = new Date(b.start_time);
                const endD = new Date(b.end_time);

                // Use date-fns-tz to handle timezone correctly
                // If timezone is invalid, toZonedTime might throw or fallback?
                // We wrap in try-catch or assume timezone is valid (it defaults to Rome)
                let zonedStart = startD;
                let zonedEnd = endD;

                try {
                   zonedStart = toZonedTime(startD, timezone);
                   zonedEnd = toZonedTime(endD, timezone);
                } catch (e) {
                   console.error("Timezone conversion error", e);
                }

                return {
                  start_time: format(zonedStart, 'HH:mm'),
                  end_time: format(zonedEnd, 'HH:mm'),
                  status: b.status || undefined,
                  user_id: userId
                };
              })
              .filter((b): b is ExistingBookingEntry => b !== null);

            existingBookings.push(...formattedUserBookings);
          }
        } catch (err) {
          logError('Error fetching user bookings', err as Error);
        }
      }

      // Explicit type for existing bookings to be safe
      const blocked = existingBookings.map((booking) => ({
        start: addMinutesHHMM(booking.start_time.toString().substring(0, 5), -bufferMinutes),
        end: addMinutesHHMM(booking.end_time.toString().substring(0, 5), bufferMinutes),
      }));

      const baseSlots = generateTimeSlots(slotInterval, date);

      const now = new Date();
      let zonedNow: Date;
      try {
        zonedNow = toZonedTime(now, timezone);
      } catch (e) {
        console.warn('Invalid timezone', timezone, e);
        zonedNow = now;
      }

      const isToday = format(date, 'yyyy-MM-dd') === format(zonedNow, 'yyyy-MM-dd');
      const currentHH = zonedNow.getHours();
      const currentMM = zonedNow.getMinutes();

      const updatedSlots = baseSlots.map(slot => {
        const isBlocked = blocked.some((block) => slot.time >= block.start && slot.time < block.end);

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
      logError('Failed to fetch slots', err as Error);
      toast.error('Errore nel caricamento degli slot');
      setBookingState(prev => ({ ...prev, isLoadingSlots: false }));
    }
  }, [spaceId, getAvailabilityForDate, generateTimeSlots, slotInterval, bufferMinutes, timezone, debug, logError, userId]);


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

  const handleConfirmBooking = async (
    validateFiscalData: () => boolean,
    user: { id: string } | null
  ) => {
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
      if (!user) {
        if (onError) onError('Devi essere autenticato per prenotare');
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
        userId: user.id,
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
        // SMART RECOVERY LOGIC for 23P01
        if (result.errorCode === 'CONFLICT') {
             toast.error("Spiacenti, questo slot è stato appena prenotato da un altro utente.");

             // Automatically refresh slots
             if (bookingState.selectedDate) {
                 await fetchAvailableSlots(bookingState.selectedDate);
             }

             // Reset selection but stay on TIME step
             setBookingState(prev => ({
                 ...prev,
                 selectedRange: null
             }));
             setCurrentStep('TIME');

        } else if (result.error?.includes('Insert failed')) {
           toast.error('Errore Database', { description: result.error });
        } else if (result.error?.includes('Posti insufficienti')) {
           toast.error('Posti insufficienti');
        } else {
           const errorMsg = result.error || 'Errore durante la prenotazione';
           toast.error('Errore prenotazione', { description: errorMsg });
           if (onError) onError(errorMsg);
        }
        return;
      }

      if (confirmationType === 'host_approval') {
        toast.success('Richiesta inviata!');
        if (onSuccess) setTimeout(onSuccess, 2000);
      }

    } catch (err) {
      logError('Unexpected error', err as Error);
      if (onError) onError('Errore imprevisto');
    } finally {
      setBookingState(prev => ({ ...prev, isReserving: false }));
    }
  };

  return {
    currentStep,
    setCurrentStep,
    bookingState,
    setBookingState,
    acceptedPolicy,
    setAcceptedPolicy,
    requestInvoice,
    setRequestInvoice,
    coworkerFiscalData,
    setCoworkerFiscalData,
    fiscalErrors,
    setFiscalErrors,
    fiscalDataPreFilled,
    setFiscalDataPreFilled,
    isCheckoutLoading,
    handleDateSelect,
    handleTimeRangeSelect,
    handleConfirmBooking,
    pricePerHour
  };
}
