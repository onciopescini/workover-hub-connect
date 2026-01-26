import { renderHook, act, waitFor } from '@testing-library/react';
import { useBookingFlow } from '../useBookingFlow';
import { supabase } from '@/integrations/supabase/client';
import { fetchOptimizedSpaceAvailability } from "@/lib/availability-rpc";

// Mock Supabase
const mockSupabaseQuery = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockResolvedValue({ data: [], error: null })
};

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseQuery)
  }
}));

// Mock availability RPC
jest.mock('@/lib/availability-rpc', () => ({
  fetchOptimizedSpaceAvailability: jest.fn(),
  getAvailableCapacity: jest.fn()
}));

// Mock other hooks
jest.mock('@/hooks/checkout/useCheckout', () => ({
  useCheckout: () => ({
    processCheckout: jest.fn(),
    isLoading: false
  })
}));

jest.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  })
}));

describe('useBookingFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseQuery.in.mockResolvedValue({ data: [], error: null });
    (fetchOptimizedSpaceAvailability as jest.Mock).mockResolvedValue([]);
  });

  const props = {
    spaceId: 'space-1',
    pricePerDay: 100,
    confirmationType: 'instant',
    maxCapacity: 5,
    userId: 'user-1',
    timezone: 'UTC' // Force UTC to avoid timezone issues in test
  };

  it('should fetch user bookings when userId is provided', async () => {
    const { result } = renderHook(() => useBookingFlow(props));

    const date = new Date('2099-10-10T00:00:00Z');
    const dateStr = '2099-10-10';

    // Mock user booking: 10:00 - 11:00 UTC
    mockSupabaseQuery.in.mockResolvedValue({
      data: [{ start_time: `${dateStr}T10:00:00Z`, end_time: `${dateStr}T11:00:00Z`, status: 'confirmed' }],
      error: null
    });

    await act(async () => {
      await result.current.handleDateSelect(date);
    });

    // Verify Supabase call
    expect(supabase.from).toHaveBeenCalledWith('bookings');
    expect(mockSupabaseQuery.select).toHaveBeenCalledWith('start_time, end_time, status');
    expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('space_id', 'space-1');
    expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('booking_date', dateStr);
    expect(mockSupabaseQuery.in).toHaveBeenCalledWith('status', ['confirmed', 'pending_approval', 'pending_payment']);

    // Verify slots are blocked
    const slots = result.current.bookingState.availableSlots;
    const slot1000 = slots.find(s => s.time === '10:00');
    const slot1030 = slots.find(s => s.time === '10:30');
    const slot1100 = slots.find(s => s.time === '11:00');

    // 10:00 - 11:00 should be blocked
    expect(slot1000?.available).toBe(false);
    expect(slot1000?.reserved).toBe(true);
    expect(slot1030?.available).toBe(false);
    expect(slot1030?.reserved).toBe(true);

    // 11:00 should be available (start of next slot)
    expect(slot1100?.available).toBe(true);
    expect(slot1100?.reserved).toBe(false);
  });

  it('should NOT fetch user bookings when userId is missing', async () => {
     // @ts-ignore
     const { result } = renderHook(() => useBookingFlow({ ...props, userId: undefined }));

     const date = new Date('2099-10-10T00:00:00Z');

     await act(async () => {
        await result.current.handleDateSelect(date);
     });

     expect(supabase.from).not.toHaveBeenCalled();
  });
});
