import React, { useEffect } from 'react';
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";
import { useCoworkerFiscalData } from '@/hooks/useCoworkerFiscalData';
import { supabase } from "@/integrations/supabase/client";
import { z } from 'zod';
import { coworkerFiscalSchema } from '@/lib/validation/checkoutFiscalSchema';
import { TwoStepBookingForm } from "@/components/booking-wizard/TwoStepBookingForm";
import { useBookingFlow } from '@/hooks/booking/useBookingFlow';
import type { AvailabilityData } from '@/types/availability';

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
  availability?: AvailabilityData | string;
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
  const { info } = useLogger({ context: 'BookingForm' });
  const { fiscalData: savedFiscalData } = useCoworkerFiscalData();

  const bookingFlow = useBookingFlow({
    spaceId,
    pricePerDay,
    pricePerHour: pricePerHourProp,
    confirmationType,
    maxCapacity,
    hostStripeAccountId,
    availability,
    timezone,
    bufferMinutes,
    slotInterval,
    cancellationPolicy,
    rules,
    onSuccess,
    onError
  });

  const {
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
  } = bookingFlow;

  // Effects
  useEffect(() => {
    if (savedFiscalData && !fiscalDataPreFilled) {
      setCoworkerFiscalData(savedFiscalData);
      setFiscalDataPreFilled(true);
      info('Fiscal data pre-filled from profile');
    }
  }, [savedFiscalData, fiscalDataPreFilled, setCoworkerFiscalData, setFiscalDataPreFilled, info]);

  // Validation
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

  const handleGuestsChange = (count: number) => {
    setBookingState(prev => ({ ...prev, guestsCount: Math.max(1, count) }));
  };

  const onConfirm = async () => {
     const { data: user } = await supabase.auth.getUser();
     // If user is not authenticated, pass null. The hook handles the error.
     handleConfirmBooking(validateFiscalData, user?.user ? { id: user.user.id } : null);
  };

  return (
    <TwoStepBookingForm
      // Config
      spaceId={spaceId}
      pricePerDay={pricePerDay}
      pricePerHour={pricePerHour}
      confirmationType={confirmationType}
      maxCapacity={maxCapacity}
      cancellationPolicy={cancellationPolicy ?? 'moderate'}
      rules={rules ?? ''}
      bufferMinutes={bufferMinutes}
      slotInterval={slotInterval}
      hostStripeAccountId={hostStripeAccountId ?? ''}
      availability={availability}
      hostFiscalRegime={hostFiscalRegime ?? ''}
      timezone={timezone}

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
      onConfirm={onConfirm}
      setAcceptedPolicy={setAcceptedPolicy}
      setRequestInvoice={setRequestInvoice}
      setCoworkerFiscalData={setCoworkerFiscalData}
    />
  );
}
