import { renderHook, act } from '@testing-library/react';
import { useCheckout } from '../useCheckout';
import * as bookingService from '@/services/api/bookingService';

jest.mock('@/services/api/bookingService', () => ({
  reserveSlot: jest.fn(),
  createCheckoutSession: jest.fn(),
}));

jest.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
  }),
}));

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
    durationHours: 1,
  };

  it('should handle successful checkout flow', async () => {
    (bookingService.reserveSlot as jest.Mock).mockResolvedValue({
      success: true,
      bookingId: 'booking-123',
    });

    (bookingService.createCheckoutSession as jest.Mock).mockResolvedValue({
      success: true,
      url: 'https://checkout.stripe.com/session-123',
      sessionId: 'cs_test_123',
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);
      expect(outcome.success).toBe(true);
      expect(outcome.bookingId).toBe('booking-123');
    });

    expect(bookingService.createCheckoutSession).toHaveBeenCalledWith('booking-123');
  });

  it('should handle checkout session failure', async () => {
    (bookingService.reserveSlot as jest.Mock).mockResolvedValue({
      success: true,
      bookingId: 'booking-123',
    });

    (bookingService.createCheckoutSession as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Payment service unavailable',
      errorCode: 'SERVER_ERROR',
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Payment service unavailable');
      expect(outcome.errorCode).toBe('SERVER_ERROR');
    });
  });

  it('should handle unauthorized checkout error', async () => {
    (bookingService.reserveSlot as jest.Mock).mockResolvedValue({
      success: true,
      bookingId: 'booking-123',
    });

    (bookingService.createCheckoutSession as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Session expired, please login again',
      errorCode: 'UNAUTHORIZED',
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Session expired, please login again');
      expect(outcome.errorCode).toBe('UNAUTHORIZED');
    });
  });

  it('should handle network errors gracefully', async () => {
    (bookingService.reserveSlot as jest.Mock).mockResolvedValue({
      success: true,
      bookingId: 'booking-123',
    });

    (bookingService.createCheckoutSession as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Connection failed, please check your internet',
      errorCode: 'NETWORK',
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Connection failed, please check your internet');
      expect(outcome.errorCode).toBe('NETWORK');
    });
  });

  it('should handle exception thrown by service', async () => {
    (bookingService.reserveSlot as jest.Mock).mockRejectedValue(new Error('Unexpected service error'));

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Unexpected service error');
      expect(outcome.errorCode).toBe('UNKNOWN');
    });
  });
});
