import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TwoStepBookingForm } from '@/components/booking/TwoStepBookingForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

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
};

export default meta;
type Story = StoryObj<typeof TwoStepBookingForm>;

export const Step1DateSelection: Story = {
  args: {
    spaceId: 'mock-space-id',
    pricePerHour: 15,
    pricePerDay: 100,
    maxCapacity: 10,
  },
  parameters: {
    docs: {
      description: {
        story: 'First step of the booking form where users select date and time.',
      },
    },
  },
};

export const Step2GuestDetails: Story = {
  args: {
    spaceId: 'mock-space-id',
    pricePerHour: 15,
    pricePerDay: 100,
    maxCapacity: 10,
  },
  parameters: {
    docs: {
      description: {
        story: 'Second step where users enter guest count and special requests.',
      },
    },
  },
};

export const WithHighCapacity: Story = {
  args: {
    spaceId: 'mock-space-id',
    pricePerHour: 25,
    pricePerDay: 180,
    maxCapacity: 50,
  },
  parameters: {
    docs: {
      description: {
        story: 'Booking form for a high-capacity space (50 people).',
      },
    },
  },
};
