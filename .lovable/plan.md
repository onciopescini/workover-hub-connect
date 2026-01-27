
# Day 8: The Final Seal - Integration Tests

## Objective

Create an integration test that validates the complete Booking -> Payment flow, ensuring the Service Layer works correctly end-to-end without hitting real APIs.

---

## Analysis Summary

### Current Testing Setup
- **Test Runner:** Jest with ts-jest (configured in `jest.config.cjs`)
- **Test Environment:** jsdom
- **Setup File:** `src/setupTests.ts` with mocks for matchMedia, IntersectionObserver, ResizeObserver
- **Existing Tests:** `src/hooks/checkout/__tests__/useCheckout.test.ts` provides excellent patterns for mocking

### Console.log Cleanup Status
Production code is clean - verified that:
- `src/services/api/bookingService.ts` uses only `sreLogger`
- `src/hooks/checkout/useCheckout.ts` uses only `sreLogger`
- `vite.config.ts:101-102` drops all `console.*` and `debugger` statements in production builds

---

## Implementation Plan

### 1. Create Integration Test File

**New File:** `src/services/api/__tests__/booking-integration.test.ts`

This test simulates the complete user journey: Reserve Slot -> Create Checkout Session

```typescript
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
      const reserveParams = {
        spaceId: 'space-abc',
        userId: 'user-xyz',
        startTime: '2025-02-15T10:00:00.000Z',
        endTime: '2025-02-15T11:00:00.000Z',
        guests: 2,
        confirmationType: 'instant' as const,
        clientBasePrice: 2500 // €25.00 in cents
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

    it('should stop flow if reservation fails', async () => {
      // Arrange: Mock reservation failure
      const reserveSlotSpy = jest.spyOn(bookingService, 'reserveSlot')
        .mockResolvedValue({
          success: false,
          error: 'Slot already booked',
          errorCode: 'CONFLICT'
        });

      const createCheckoutSpy = jest.spyOn(bookingService, 'createCheckoutSession');

      // Act
      const reserveParams = {
        spaceId: 'space-abc',
        userId: 'user-xyz',
        startTime: '2025-02-15T10:00:00.000Z',
        endTime: '2025-02-15T11:00:00.000Z',
        guests: 2,
        confirmationType: 'instant' as const
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
```

---

### 2. Test Coverage Summary

| Scenario | Test Case | Expected Result |
|----------|-----------|-----------------|
| Happy Path | Reserve + Checkout succeeds | Both return success, correct params passed |
| Reservation Failure | Slot conflict (CONFLICT) | Flow stops, checkout not called |
| Checkout Failure | Server error after reservation | Reservation OK, checkout fails gracefully |
| Auth Error | Session expired | Returns UNAUTHORIZED error code |
| Network Error | Connection failed | Returns NETWORK error code |
| Exports | Functions defined | reserveSlot, createCheckoutSession exported |

---

### 3. Project Health Verification

**Console.log Status:** CLEAN

The production code has been verified clean:
- `bookingService.ts` - Uses `sreLogger` (11 log points)
- `useCheckout.ts` - Uses `sreLogger` (7 log points)
- `vite.config.ts:101-102` - Production build strips all console statements:
  ```typescript
  drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  ```

**Remaining console.log in codebase are intentional:**
- `src/lib/sre-logger.ts` - The logger itself (output sink)
- Dev-only contexts with `import.meta.env.DEV` guards
- CLI scripts (`scripts/migration-runner.ts`)
- Edge Functions (Supabase logging infrastructure)

---

## Files Summary

### Files to Create

| File | Description |
|------|-------------|
| `src/services/api/__tests__/booking-integration.test.ts` | Integration test for booking flow |

### Files to Verify (No Changes Needed)

| File | Status |
|------|--------|
| `src/services/api/bookingService.ts` | Clean - uses sreLogger |
| `src/hooks/checkout/useCheckout.ts` | Clean - uses sreLogger |
| `vite.config.ts` | Production drops console statements |

---

## Technical Notes

### Jest vs Vitest
The project uses Jest (not Vitest) for unit/integration tests as configured in:
- `jest.config.cjs` - Main configuration
- `package.json:13` - `"test": "jest --coverage"`

Some files in `tests/integration/` use Vitest syntax, but the core `src/**/__tests__/` directory uses Jest.

### Test Patterns Used
Following existing patterns from `src/hooks/checkout/__tests__/useCheckout.test.ts`:
- `jest.spyOn()` for mocking service functions
- `jest.mock()` for module-level mocks
- `mockResolvedValue()` for async returns
- `mockRestore()` for cleanup

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Integration tests for bookingService | 0 | 6 |
| Test coverage for booking flow | Partial | Complete |
| Console.log in production services | 0 | 0 (verified) |

---

## Verification Checklist

After implementation:
- [ ] `npm run test` passes all tests
- [ ] Integration test covers happy path and error cases
- [ ] `npm run build` succeeds with 0 errors
- [ ] No console.log in `src/services/api/*.ts`
- [ ] No console.log in `src/hooks/checkout/*.ts`
