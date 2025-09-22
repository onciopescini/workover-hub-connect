import { describe, it, expect } from '@jest/globals';
import { computePricing } from '@/lib/pricing';

describe('computePricing', () => {
  const baseInput = {
    serviceFeePct: 0.12,
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
      expect(result.serviceFee).toBe(6.3); // 52.5 * 0.12
      expect(result.vat).toBe(12.93); // (52.5 + 6.3) * 0.22
      expect(result.total).toBe(71.73); // 52.5 + 6.3 + 12.93
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
      expect(result.serviceFee).toBe(18); // 150 * 0.12
      expect(result.vat).toBe(36.96); // (150 + 18) * 0.22
      expect(result.total).toBe(204.96); // 150 + 18 + 36.96
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
      expect(result.serviceFee).toBe(12); // 100 * 0.12
      expect(result.vat).toBe(24.64); // (100 + 12) * 0.22
      expect(result.total).toBe(136.64); // 100 + 12 + 24.64
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
      expect(result.serviceFee).toBe(14.4); // 120 * 0.12
      expect(result.vat).toBe(29.57); // (120 + 14.4) * 0.22
      expect(result.total).toBe(163.97); // 120 + 14.4 + 29.57
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
      expect(result.serviceFee).toBe(12); // 100 * 0.12
      expect(result.vat).toBe(0); // Should be 0 when Stripe Tax enabled
      expect(result.total).toBe(112); // 100 + 12 + 0
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
      expect(result.serviceFee).toBe(4); // 33.33 * 0.12 = 3.9996 -> 4.00
      expect(result.vat).toBe(8.21); // (33.33 + 4) * 0.22 = 8.2126 -> 8.21
      expect(result.total).toBe(45.54); // 33.33 + 4 + 8.21
    });
  });
});