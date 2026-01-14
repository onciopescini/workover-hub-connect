import React from 'react';
import { TwoStepBookingForm } from "../booking/TwoStepBookingForm";

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
  hostStripeAccountId?: string; // Required for Stripe Connect payments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availability?: any; // Availability configuration from host
  authorId?: string;
  minBookingHours?: number;
  timezone?: string;
}

export function BookingForm({ spaceId, pricePerDay, pricePerHour, confirmationType, maxCapacity, cancellationPolicy, rules, onSuccess, onError, hostStripeAccountId, availability, timezone }: BookingFormProps) {
  // Use the new 2-step booking form with visual calendar as default
  return (
    <TwoStepBookingForm
      spaceId={spaceId}
      pricePerDay={pricePerDay}
      pricePerHour={pricePerHour || pricePerDay / 8} // Default to 8-hour workday
      confirmationType={confirmationType}
      maxCapacity={maxCapacity}
      cancellationPolicy={cancellationPolicy || 'moderate'}
      rules={rules || ''}
      onSuccess={onSuccess}
      onError={onError}
      bufferMinutes={0} // Default buffer
      slotInterval={30} // Default 30-minute slots
      availability={availability}
      timezone={timezone || 'Europe/Rome'}
      {...(hostStripeAccountId && { hostStripeAccountId })}
    />
  );
}
