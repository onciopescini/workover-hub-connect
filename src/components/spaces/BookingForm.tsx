import React, { useEffect } from 'react';
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";
import { useCoworkerFiscalData } from '@/hooks/useCoworkerFiscalData';
import { supabase } from "@/integrations/supabase/client";
import { z } from 'zod';
import { coworkerFiscalSchema } from '@/lib/validation/checkoutFiscalSchema';
import { TwoStepBookingForm } from "@/components/booking-wizard/TwoStepBookingForm";
import { useBookingFlow } from '@/hooks/booking/useBookingFlow';
import { useAuth } from '@/hooks/auth/useAuth';
import type { AvailabilityData } from '@/types/availability';

interface BookingFormProps {
  spaceId: string;
  pricePerDay: number;
  pricePerHour?: number | undefined;
  confirmationType: string;
  maxCapacity: number;
  cancellationPolicy?: string | undefined;
  rules?: string | undefined;
  onSuccess: () => void;
  onError: (message: string) => void;
  hostStripeAccountId?: string | undefined;
  availability?: AvailabilityData | string | undefined;
  authorId?: string | undefined;
  minBookingHours?: number | undefined;
  timezone?: string | undefined;
  bufferMinutes?: number | undefined;
  slotInterval?: number | undefined;
  hostFiscalRegime?: string | undefined;
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
  const { authState } = useAuth();

  const bookingFlow = useBookingFlow({
    spaceId,
    pricePerDay,
    userId: authState.user?.id,
    ...(pricePerHourProp !== undefined && { pricePerHour: pricePerHourProp }),
    confirmationType,
    maxCapacity,
    ...(hostStripeAccountId !== undefined && { hostStripeAccountId }),
    ...(availability !== undefined && { availability }),
    ...(timezone !== undefined && { timezone }),
    bufferMinutes: bufferMinutes,
    slotInterval: slotInterval,
    ...(cancellationPolicy !== undefined && { cancellationPolicy }),
    ...(rules !== undefined && { rules }),
    onSuccess: onSuccess,
    onError: onError
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
      pricePerHour={pricePerHour ?? 0}
      confirmationType={confirmationType}
      maxCapacity={maxCapacity}
      cancellationPolicy={cancellationPolicy ?? 'moderate'}
      rules={rules ?? ''}
      bufferMinutes={bufferMinutes}
      slotInterval={slotInterval}
      {...(hostStripeAccountId !== undefined && { hostStripeAccountId })}
      {...(availability !== undefined && { availability })}
      {...(hostFiscalRegime !== undefined && { hostFiscalRegime })}
      {...(timezone !== undefined && { timezone })}

      // State
      currentStep={currentStep}
      bookingState={bookingState}
      acceptedPolicy={acceptedPolicy}
      requestInvoice={requestInvoice}
      coworkerFiscalData={coworkerFiscalData}
      fiscalErrors={fiscalErrors}
      isReserving={bookingState.isReserving}
      isCheckoutLoading={isCheckoutLoading}
      {...(fiscalDataPreFilled !== undefined && { fiscalDataPreFilled })}

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
