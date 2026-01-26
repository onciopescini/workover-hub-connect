import { renderHook, act } from '@testing-library/react';
import { useCheckout } from '../useCheckout';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
    functions: {
      invoke: jest.fn()
    }
  }
}));

// Mock logger
jest.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    debug: jest.fn(),
    error: jest.fn()
  })
}));

// Mock window.location
const originalLocation = window.location;
beforeAll(() => {
  // @ts-ignore
  delete window.location;
  // @ts-ignore
  window.location = { href: '', origin: 'http://localhost' };
});

afterAll(() => {
  window.location = originalLocation;
});

describe('useCheckout - Reservation Failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams = {
    spaceId: 'space-123',
    userId: 'user-123',
    date: new Date('2023-10-10'),
    startTime: '10:00',
    endTime: '11:00',
    guestsCount: 1,
    confirmationType: 'instant' as const,
    pricePerHour: 10,
    pricePerDay: 80,
    durationHours: 1
  };

  it('should abort if RPC returns success: false with error message', async () => {
    // Setup RPC failure (soft failure in data)
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { success: false, error: 'Space is full' },
      error: null
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Space is full');
      expect(outcome.errorCode).toBe('RESERVATION_FAILED');
    });

    // Ensure create-checkout-v3 was NOT called
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('should abort if RPC returns success: true but no booking_id', async () => {
    // Setup RPC success but missing ID
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { success: true, booking_id: null },
      error: null
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Booking creation succeeded but returned no ID');
    });

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('should abort if RPC returns null data', async () => {
    // Setup RPC returns null data
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: null
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Reservation failed: No response from server');
    });

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('should proceed if RPC returns success: true with booking_id', async () => {
      // Setup RPC success
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { success: true, booking_id: 'booking-123' },
      error: null
    });

    // Setup Checkout success
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { url: 'http://stripe.com' },
        error: null
      });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(true);
      expect(outcome.bookingId).toBe('booking-123');
    });

    expect(supabase.functions.invoke).toHaveBeenCalled();
  });

  it('should proceed if RPC returns legacy response (no success field) but has booking_id', async () => {
    // Setup RPC success legacy
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { booking_id: 'booking-legacy', status: 'pending' },
      error: null
    });

    // Setup Checkout success
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { url: 'http://stripe.com' },
        error: null
      });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(true);
      expect(outcome.bookingId).toBe('booking-legacy');
    });

    expect(supabase.functions.invoke).toHaveBeenCalled();
  });
});
