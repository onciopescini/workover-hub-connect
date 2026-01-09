import { calculateRefund } from './policy-calculator';

describe('calculateRefund', () => {
  const totalAmount = 10000; // 100.00 currency units

  const now = new Date('2023-01-01T10:00:00Z');

  // Helper to create dates relative to now
  const createDateInFuture = (hours: number) => {
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
  };

  const createDateInPast = (hours: number) => {
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  };

  describe('FLEXIBLE Policy', () => {
    const policy = 'flexible';

    test('should refund 100% if cancelled > 24h before', () => {
      // 25 hours later
      const start = createDateInFuture(25);
      const result = calculateRefund(totalAmount, policy, start, now);
      expect(result.refundAmount).toBe(10000);
      expect(result.penaltyAmount).toBe(0);
      expect(result.penaltyPercentage).toBe(0);
    });

    test('should refund 100% if cancelled exactly 24h before', () => {
      const start = createDateInFuture(24);
      const result = calculateRefund(totalAmount, policy, start, now);
      expect(result.refundAmount).toBe(10000);
    });

    test('should refund 0% if cancelled < 24h before', () => {
      const start = createDateInFuture(23);
      const result = calculateRefund(totalAmount, policy, start, now);
      expect(result.refundAmount).toBe(0);
      expect(result.penaltyAmount).toBe(10000);
      expect(result.penaltyPercentage).toBe(100);
    });
  });

  describe('MODERATE Policy', () => {
    const policy = 'moderate';

    test('should refund 100% if cancelled >= 5 days before', () => {
      // 5 days = 120 hours
      const start = createDateInFuture(120);
      const result = calculateRefund(totalAmount, policy, start, now);
      expect(result.refundAmount).toBe(10000);
    });

    test('should refund 50% if cancelled between 5 days and 24h', () => {
      const start = createDateInFuture(48); // 2 days
      const result = calculateRefund(totalAmount, policy, start, now);
      expect(result.refundAmount).toBe(5000);
      expect(result.penaltyAmount).toBe(5000);
    });

    test('should refund 0% if cancelled < 24h', () => {
      const start = createDateInFuture(23);
      const result = calculateRefund(totalAmount, policy, start, now);
      expect(result.refundAmount).toBe(0);
    });
  });

  describe('STRICT Policy', () => {
    const policy = 'strict';

    test('should refund 50% if cancelled >= 7 days before', () => {
      // 7 days = 168 hours
      const start = createDateInFuture(168);
      const result = calculateRefund(totalAmount, policy, start, now);
      expect(result.refundAmount).toBe(5000);
    });

    test('should refund 0% if cancelled < 7 days before', () => {
      const start = createDateInFuture(167); // Just under 7 days
      const result = calculateRefund(totalAmount, policy, start, now);
      expect(result.refundAmount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle case insensitivity', () => {
      const start = createDateInFuture(25);
      const result = calculateRefund(totalAmount, 'FLEXIBLE', start, now);
      expect(result.refundAmount).toBe(10000);
    });

    test('should default to moderate for unknown policy', () => {
      const start = createDateInFuture(120); // 5 days
      const result = calculateRefund(totalAmount, 'unknown_policy', start, now);
      expect(result.refundAmount).toBe(10000); // Moderate rule > 5 days

      const startShort = createDateInFuture(23);
      const resultShort = calculateRefund(totalAmount, 'unknown_policy', startShort, now);
      expect(resultShort.refundAmount).toBe(0);
    });

    test('should refund 0% if booking has already started', () => {
      const start = createDateInPast(1); // Started 1 hour ago
      const result = calculateRefund(totalAmount, 'flexible', start, now);
      expect(result.refundAmount).toBe(0);
    });

    test('should round appropriately', () => {
        // 3333 total, 50% refund = 1666.5
        const oddAmount = 3333;
        const start = createDateInFuture(48); // moderate 50%
        const result = calculateRefund(oddAmount, 'moderate', start, now);
        expect(result.refundAmount).toBe(1666.5);
        expect(result.penaltyAmount).toBe(1666.5);
    });
  });
});
