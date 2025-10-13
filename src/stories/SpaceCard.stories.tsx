import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { BrowserRouter } from 'react-router-dom';

const mockSpace = {
  id: 'space-1',
  title: 'Modern Coworking Space',
  description: 'A bright and spacious coworking area in the heart of the city',
  price_per_hour: 15,
  price_per_day: 100,
  category: 'professional' as const,
  work_environment: 'controlled' as const,
  max_capacity: 10,
  address: 'Via Roma 123, Milano',
  photos: ['/placeholder.svg'],
  amenities: ['wifi', 'coffee', 'parking'],
  workspace_features: ['desk', 'monitor', 'ergonomic_chair'],
  seating_types: ['desk', 'lounge'],
  published: true,
  is_suspended: false,
  pending_approval: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  host_id: 'host-1',
  latitude: 45.4642,
  longitude: 9.1900,
  confirmation_type: 'host_approval' as const,
  availability: { recurring: [], exceptions: [] },
  approved_at: null,
  approved_by: null,
  capacity: 10,
  suspended_by: null,
  suspended_at: null,
  revision_requested: false,
  deleted_at: null,
  cancellation_policy: 'moderate' as const,
  rules: 'No smoking, respect quiet hours',
  ideal_guest_tags: [],
  event_friendly_tags: [],
  rejection_reason: null,
  suspension_reason: null,
  revision_notes: null,
};

const meta: Meta<typeof SpaceCard> = {
  title: 'Spaces/SpaceCard',
  component: SpaceCard,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="p-6 max-w-md">
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Card component displaying space information with image, title, pricing, and key details.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SpaceCard>;

export const Default: Story = {
  args: {
    space: mockSpace,
  },
};

export const MeetingRoom: Story = {
  args: {
    space: {
      ...mockSpace,
      title: 'Executive Meeting Room',
      category: 'professional' as const,
      work_environment: 'dynamic' as const,
      price_per_hour: 35,
      price_per_day: 250,
      max_capacity: 12,
      amenities: ['projector', 'whiteboard', 'video_conferencing'],
    },
  },
};

export const PrivateOffice: Story = {
  args: {
    space: {
      ...mockSpace,
      title: 'Private Office Suite',
      category: 'professional' as const,
      work_environment: 'silent' as const,
      price_per_hour: 50,
      price_per_day: 400,
      max_capacity: 4,
      amenities: ['wifi', 'printer', 'coffee', 'phone_booth'],
    },
  },
};

export const EventSpace: Story = {
  args: {
    space: {
      ...mockSpace,
      title: 'Large Event Hall',
      category: 'outdoor' as const,
      work_environment: 'dynamic' as const,
      price_per_hour: 100,
      price_per_day: 800,
      max_capacity: 100,
      amenities: ['stage', 'sound_system', 'catering_area'],
    },
  },
};
