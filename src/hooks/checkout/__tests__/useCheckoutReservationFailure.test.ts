import { renderHook, act } from '@testing-library/react';
import { useCheckout } from '../useCheckout';
import * as bookingService from '@/services/api/bookingService';

// Mock the booking service
jest.mock('@/services/api/bookingService', () => ({
  reserveSlot: jest.fn(),
  createCheckoutSession: jest.fn()
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
  Object.defineProperty(window, 'location', {
    value: { href: '', origin: 'http://localhost' } as unknown as Location,
    writable: true,
    configurable: true
  });
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
    configurable: true
  });
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

  it('should abort if reservation returns conflict error', async () => {
    (bookingService.reserveSlot as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Slot already booked',
      errorCode: 'CONFLICT'
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Slot already booked');
      expect(outcome.errorCode).toBe('CONFLICT');
    });

    // Checkout should NOT be called when reservation fails
    expect(bookingService.createCheckoutSession).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should abort if reservation returns server error', async () => {
    (bookingService.reserveSlot as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Booking creation failed: Database gone away',
      errorCode: 'SERVER_ERROR'
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);
      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Booking creation failed: Database gone away');
    });

    expect(bookingService.createCheckoutSession).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should abort if reservation returns no booking ID', async () => {
    (bookingService.reserveSlot as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Invalid Booking ID received from server',
      errorCode: 'SERVER_ERROR'
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);
      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Invalid Booking ID received from server');
    });

    expect(bookingService.createCheckoutSession).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should abort if reservation returns null response', async () => {
    (bookingService.reserveSlot as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Reservation failed: No response from server',
      errorCode: 'SERVER_ERROR'
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);
      expect(outcome.success).toBe(false);
      expect(outcome.error).toBe('Reservation failed: No response from server');
    });

    expect(bookingService.createCheckoutSession).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should proceed to checkout if reservation succeeds', async () => {
    (bookingService.reserveSlot as jest.Mock).mockResolvedValue({
      success: true,
      bookingId: 'booking-123'
    });

    (bookingService.createCheckoutSession as jest.Mock).mockResolvedValue({
      success: true,
      url: 'https://checkout.stripe.com/session-123',
      sessionId: 'cs_test_123'
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      const outcome = await result.current.processCheckout(mockParams);

      expect(outcome.success).toBe(true);
      expect(outcome.bookingId).toBe('booking-123');
    });

    expect(bookingService.createCheckoutSession).toHaveBeenCalledWith('booking-123');
  });
});
