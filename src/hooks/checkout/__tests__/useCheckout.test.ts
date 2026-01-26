import { renderHook, act } from '@testing-library/react';
import { useCheckout } from '../useCheckout';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn()
    },
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

describe('useCheckout', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();

  beforeAll(() => {
    global.fetch = mockFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default auth success
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null
    });
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

  it('should handle native fetch error correctly', async () => {
    // Setup RPC success
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { booking_id: 'booking-123', status: 'pending' },
      error: null
    });

    // Setup Fetch Failure
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Server Error Details')
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Server responded with 500: Internal Server Error Details');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Checkout Network Error: 500", "Internal Server Error Details");

    consoleErrorSpy.mockRestore();
  });

  it('should log payload before fetch and call fetch with correct args', async () => {
     // Setup RPC success
     (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { booking_id: 'booking-123', status: 'pending' },
        error: null
      });

      // Setup Fetch Success
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ url: 'http://stripe.com' })
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        const outcome = await result.current.processCheckout(mockParams);
        expect(outcome.success).toBe(true);
      });

      expect(consoleLogSpy).toHaveBeenCalledWith("CHECKOUT PAYLOAD:", expect.objectContaining({
          booking_id: 'booking-123',
          return_url: expect.stringContaining('/messages')
      }));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/create-checkout-v3'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"booking_id":"booking-123"')
        })
      );

      consoleLogSpy.mockRestore();
  });

  it('should handle network crash (fetch throws) safely', async () => {
    // Setup RPC success
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { booking_id: 'booking-123', status: 'pending' },
      error: null
    });

    // Setup Network Error
    const mockNetworkError = new Error('Network request failed');
    mockFetch.mockRejectedValue(mockNetworkError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Network request failed');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("CRITICAL FAILURE:", "Network request failed");

    consoleErrorSpy.mockRestore();
  });
});
