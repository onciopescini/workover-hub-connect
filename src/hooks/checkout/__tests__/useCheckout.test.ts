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

describe('useCheckout', () => {
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

  it('should handle FunctionsHttpError with body correctly', async () => {
    // Setup RPC success
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { booking_id: 'booking-123', status: 'pending' },
      error: null
    });

    // Setup Edge Function Error with context
    const mockErrorBody = { error: 'Specific Backend Error' };
    const mockResponse = {
      json: jest.fn().mockResolvedValue(mockErrorBody)
    };
    const mockFunctionsError = {
      message: 'Function invocation failed',
      context: mockResponse
    };

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: mockFunctionsError
    });

    // Spy on console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Specific Backend Error');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("SERVER ERROR DETAILS:", mockErrorBody);
    expect(consoleErrorSpy).toHaveBeenCalledWith("CRITICAL FAILURE:", "Specific Backend Error");

    consoleErrorSpy.mockRestore();
  });

  it('should handle FunctionsHttpError without body correctly', async () => {
    // Setup RPC success
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: { booking_id: 'booking-123', status: 'pending' },
      error: null
    });

    // Setup Edge Function Error with context but json fails
    const mockResponse = {
      json: jest.fn().mockRejectedValue(new Error('Parse error'))
    };
    const mockFunctionsError = {
      message: 'Original Error Message',
      context: mockResponse
    };

    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: mockFunctionsError
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Original Error Message');
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to parse error response body", expect.any(Error));
    expect(consoleErrorSpy).toHaveBeenCalledWith("CRITICAL FAILURE:", "Original Error Message");

    consoleErrorSpy.mockRestore();
  });

  it('should log payload before invoke', async () => {
     // Setup RPC success
     (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { booking_id: 'booking-123', status: 'pending' },
        error: null
      });

      // Setup Invoke success
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: { url: 'http://stripe.com' },
        error: null
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

      consoleLogSpy.mockRestore();
  });
});
