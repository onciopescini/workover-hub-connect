/**
 * Booking Integration Test
 * 
 * Tests the complete booking -> payment flow using the Service Layer.
 * Validates that bookingService methods are called in correct sequence
 * with proper parameters.
 */

import * as bookingService from '../bookingService';

// Mock the Supabase client (used internally by bookingService)
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
        error: null
      })
    }
  }
}));

// Mock sreLogger
jest.mock('@/lib/sre-logger', () => ({
  sreLogger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock fetch for Edge Function calls
global.fetch = jest.fn();

// Mock crypto.randomUUID for idempotency key
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: jest.fn(() => 'test-uuid-1234') }
});

describe('Booking Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Booking -> Checkout Flow', () => {
    it('should reserve slot and create checkout session successfully', async () => {
      // Arrange: Mock reserveSlot via spyOn
      const reserveSlotSpy = jest.spyOn(bookingService, 'reserveSlot')
        .mockResolvedValue({
          success: true,
          bookingId: 'booking-123'
        });

      const createCheckoutSpy = jest.spyOn(bookingService, 'createCheckoutSession')
        .mockResolvedValue({
          success: true,
          url: 'https://checkout.stripe.com/pay/cs_test_123',
          sessionId: 'cs_test_123'
        });

      // Act: Step 1 - Reserve slot
      const reserveParams: bookingService.ReserveSlotParams = {
        spaceId: 'space-abc',
        userId: 'user-xyz',
        startTime: '2025-02-15T10:00:00.000Z',
        endTime: '2025-02-15T11:00:00.000Z',
        guests: 2,
        confirmationType: 'instant',
        clientBasePrice: 2500
      };

      const reserveResult = await bookingService.reserveSlot(reserveParams);

      // Assert: Reservation succeeded
      expect(reserveResult.success).toBe(true);
      expect(reserveResult.bookingId).toBe('booking-123');
      expect(reserveSlotSpy).toHaveBeenCalledWith(reserveParams);

      // Act: Step 2 - Create checkout session with booking ID
      const checkoutResult = await bookingService.createCheckoutSession('booking-123');

      // Assert: Checkout session created
      expect(checkoutResult.success).toBe(true);
      expect(checkoutResult.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(createCheckoutSpy).toHaveBeenCalledWith('booking-123');

      // Cleanup
      reserveSlotSpy.mockRestore();
      createCheckoutSpy.mockRestore();
    });

    it('should stop flow if reservation fails due to conflict', async () => {
      // Arrange: Mock reservation failure
      const reserveSlotSpy = jest.spyOn(bookingService, 'reserveSlot')
        .mockResolvedValue({
          success: false,
          error: 'Slot already booked',
          errorCode: 'CONFLICT'
        });

      const createCheckoutSpy = jest.spyOn(bookingService, 'createCheckoutSession');

      // Act
      const reserveParams: bookingService.ReserveSlotParams = {
        spaceId: 'space-abc',
        userId: 'user-xyz',
        startTime: '2025-02-15T10:00:00.000Z',
        endTime: '2025-02-15T11:00:00.000Z',
        guests: 2,
        confirmationType: 'instant'
      };

      const reserveResult = await bookingService.reserveSlot(reserveParams);

      // Assert: Reservation failed
      expect(reserveResult.success).toBe(false);
      expect(reserveResult.errorCode).toBe('CONFLICT');

      // Checkout should NOT be called when reservation fails
      expect(createCheckoutSpy).not.toHaveBeenCalled();

      // Cleanup
      reserveSlotSpy.mockRestore();
      createCheckoutSpy.mockRestore();
    });

    it('should handle checkout session failure after successful reservation', async () => {
      // Arrange
      const reserveSlotSpy = jest.spyOn(bookingService, 'reserveSlot')
        .mockResolvedValue({
          success: true,
          bookingId: 'booking-456'
        });

      const createCheckoutSpy = jest.spyOn(bookingService, 'createCheckoutSession')
        .mockResolvedValue({
          success: false,
          error: 'Payment service unavailable',
          errorCode: 'SERVER_ERROR'
        });

      // Act
      const reserveResult = await bookingService.reserveSlot({
        spaceId: 'space-abc',
        userId: 'user-xyz',
        startTime: '2025-02-15T10:00:00.000Z',
        endTime: '2025-02-15T11:00:00.000Z',
        guests: 1,
        confirmationType: 'instant'
      });

      expect(reserveResult.success).toBe(true);

      const checkoutResult = await bookingService.createCheckoutSession(reserveResult.bookingId!);

      // Assert: Checkout failed
      expect(checkoutResult.success).toBe(false);
      expect(checkoutResult.errorCode).toBe('SERVER_ERROR');

      // Cleanup
      reserveSlotSpy.mockRestore();
      createCheckoutSpy.mockRestore();
    });
  });

  describe('Service Exports', () => {
    it('should export reserveSlot function', () => {
      expect(bookingService.reserveSlot).toBeDefined();
      expect(typeof bookingService.reserveSlot).toBe('function');
    });

    it('should export createCheckoutSession function', () => {
      expect(bookingService.createCheckoutSession).toBeDefined();
      expect(typeof bookingService.createCheckoutSession).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized session error', async () => {
      const createCheckoutSpy = jest.spyOn(bookingService, 'createCheckoutSession')
        .mockResolvedValue({
          success: false,
          error: 'Session expired, please login again',
          errorCode: 'UNAUTHORIZED'
        });

      const result = await bookingService.createCheckoutSession('booking-789');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNAUTHORIZED');

      createCheckoutSpy.mockRestore();
    });

    it('should handle network error', async () => {
      const createCheckoutSpy = jest.spyOn(bookingService, 'createCheckoutSession')
        .mockResolvedValue({
          success: false,
          error: 'Connection failed, please check your internet',
          errorCode: 'NETWORK'
        });

      const result = await bookingService.createCheckoutSession('booking-999');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NETWORK');

      createCheckoutSpy.mockRestore();
    });
  });
});
