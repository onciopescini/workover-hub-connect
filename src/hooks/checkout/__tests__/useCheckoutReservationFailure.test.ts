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

  it('should abort if RPC throws an overlap error', async () => {
    // Setup RPC failure (Hard error)
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'overlap detected', code: '23P01' }
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Slot already booked');
      expect(outcome.errorCode).toBe('CONFLICT');
    });

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should abort if RPC throws a generic error', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Database gone away' }
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);
      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Booking creation failed: Database gone away');
    });
    consoleErrorSpy.mockRestore();
  });


  it('should abort if RPC returns data but no booking_id', async () => {
    // Setup RPC success but missing ID
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { status: 'pending' }, // No booking_id
      error: null
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);
      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Invalid Booking ID received from server');
    });

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should abort if RPC returns null data', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: null
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);
      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Reservation failed: No response from server');
    });
    consoleErrorSpy.mockRestore();
  });

  it('should proceed if RPC returns clean JSON with booking_id', async () => {
    // Setup RPC success
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { booking_id: 'booking-123', status: 'pending' },
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
});
