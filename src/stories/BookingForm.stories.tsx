import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TwoStepBookingForm, BookingStep, BookingState } from '@/components/booking-wizard/TwoStepBookingForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fn } from '@storybook/test';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockBookingState: BookingState = {
  selectedDate: null,
  availableSlots: [],
  selectedRange: null,
  guestsCount: 1,
  availableSpots: 10,
  isLoadingSlots: false,
  isReserving: false,
};

const mockCoworkerFiscalData = {
  billingName: '',
  billingAddress: '',
  vatNumber: '',
  sdiCode: '',
  pecEmail: '',
  isCompany: false,
};

const meta: Meta<typeof TwoStepBookingForm> = {
  title: 'Booking/TwoStepBookingForm',
  component: TwoStepBookingForm,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="p-6 max-w-2xl mx-auto">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A two-step booking form that guides users through space booking with date/time selection and guest details.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    // Config
    spaceId: 'mock-space-id',
    pricePerHour: 15,
    pricePerDay: 100,
    maxCapacity: 10,
    confirmationType: 'instant',
    cancellationPolicy: 'moderate',
    rules: 'No smoking, No pets',

    // State
    currentStep: 'DATE',
    bookingState: mockBookingState,
    acceptedPolicy: false,
    requestInvoice: false,
    coworkerFiscalData: mockCoworkerFiscalData,
    fiscalErrors: {},
    isReserving: false,
    isCheckoutLoading: false,

    // Handlers
    onDateSelect: fn(),
    onRangeSelect: fn(),
    onGuestsChange: fn(),
    onStepChange: fn(),
    onConfirm: fn(),
    setAcceptedPolicy: fn(),
    setRequestInvoice: fn(),
    setCoworkerFiscalData: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TwoStepBookingForm>;

export const Step1DateSelection: Story = {
  args: {
    currentStep: 'DATE',
  },
};

export const Step2TimeSelection: Story = {
  args: {
    currentStep: 'TIME',
    bookingState: {
      ...mockBookingState,
      selectedDate: new Date(),
      availableSlots: [
        { start: '09:00', end: '09:30', available: true },
        { start: '09:30', end: '10:00', available: true },
        { start: '10:00', end: '10:30', available: true },
      ]
    }
  },
};

export const Step3Summary: Story = {
  args: {
    currentStep: 'SUMMARY',
    acceptedPolicy: true,
    bookingState: {
      ...mockBookingState,
      selectedDate: new Date(),
      selectedRange: { startTime: '09:00', endTime: '11:00', duration: 2 },
      guestsCount: 2,
    }
  },
};
