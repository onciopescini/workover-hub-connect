import { describe, it, expect } from '@jest/globals';
import { computePricing } from '@/lib/pricing';

describe('computePricing', () => {
  const baseInput = {
    serviceFeePct: 0.05,
    vatPct: 0.22,
    stripeTaxEnabled: false,
  };

  describe('hourly pricing (< 8 hours)', () => {
    it('should calculate pricing for 3.5 hours correctly', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 3.5,
        pricePerHour: 15,
        pricePerDay: 100
      });

      expect(result.isDayRate).toBe(false);
      expect(result.base).toBe(52.5); // 3.5 * 15
      expect(result.serviceFee).toBe(2.63); // 52.5 * 0.05
      expect(result.vat).toBe(0.58); // 2.63 * 0.22
      expect(result.total).toBe(55.71); // 52.5 + 2.63 + 0.58
      expect(result.breakdownLabel).toBe('3.5h × €15/h');
    });

    it('should calculate pricing for 7.5 hours correctly', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 7.5,
        pricePerHour: 20,
        pricePerDay: 120
      });

      expect(result.isDayRate).toBe(false);
      expect(result.base).toBe(150); // 7.5 * 20
      expect(result.serviceFee).toBe(7.5); // 150 * 0.05
      expect(result.vat).toBe(1.65); // 7.5 * 0.22
      expect(result.total).toBe(159.15); // 150 + 7.5 + 1.65
      expect(result.breakdownLabel).toBe('7.5h × €20/h');
    });
  });

  describe('daily pricing (>= 8 hours)', () => {
    it('should calculate pricing for 8 hours correctly', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 8,
        pricePerHour: 15,
        pricePerDay: 100
      });

      expect(result.isDayRate).toBe(true);
      expect(result.base).toBe(100); // day rate
      expect(result.serviceFee).toBe(5); // 100 * 0.05
      expect(result.vat).toBe(1.1); // 5 * 0.22
      expect(result.total).toBe(106.1); // 100 + 5 + 1.1
      expect(result.breakdownLabel).toBe('Tariffa giornaliera (8h)');
    });

    it('should calculate pricing for 9 hours correctly', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 9,
        pricePerHour: 18,
        pricePerDay: 120
      });

      expect(result.isDayRate).toBe(true);
      expect(result.base).toBe(120); // day rate
      expect(result.serviceFee).toBe(6); // 120 * 0.05
      expect(result.vat).toBe(1.32); // 6 * 0.22
      expect(result.total).toBe(127.32); // 120 + 6 + 1.32
      expect(result.breakdownLabel).toBe('Tariffa giornaliera (9h)');
    });
  });

  describe('Stripe Tax enabled', () => {
    it('should not include VAT when Stripe Tax is enabled', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 4,
        pricePerHour: 25,
        pricePerDay: 150,
        stripeTaxEnabled: true
      });

      expect(result.base).toBe(100); // 4 * 25
      expect(result.serviceFee).toBe(5); // 100 * 0.05
      expect(result.vat).toBe(0); // Should be 0 when Stripe Tax enabled
      expect(result.total).toBe(105); // 100 + 5 + 0
    });
  });

  describe('rounding accuracy', () => {
    it('should properly round to 2 decimal places', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 2.5,
        pricePerHour: 13.33,
        pricePerDay: 80
      });

      expect(result.base).toBe(33.33); // 2.5 * 13.33 = 33.325 -> 33.33
      expect(result.serviceFee).toBe(1.67); // 33.33 * 0.05 = 1.6665 -> 1.67
      expect(result.vat).toBe(0.37); // 1.67 * 0.22 = 0.3674 -> 0.37
      expect(result.total).toBe(35.37); // 33.33 + 1.67 + 0.37
    });
  });
});