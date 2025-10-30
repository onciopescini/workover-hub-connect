import { describe, it, expect } from '@jest/globals';
import { computePricing } from '@/lib/pricing';

describe('computePricing - per person pricing', () => {
  const baseInput = {
    serviceFeePct: 0.05,
    vatPct: 0.22,
    stripeTaxEnabled: false,
  };

  describe('hourly pricing with multiple guests', () => {
    it('should multiply price by guest count (6 guests, 7 hours)', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 7,
        pricePerHour: 3.75,
        pricePerDay: 25,
        guestsCount: 6
      });

      expect(result.isDayRate).toBe(false);
      expect(result.base).toBe(157.5); // 7h × €3.75 × 6
      expect(result.serviceFee).toBe(7.88); // 157.5 × 0.05
      expect(result.vat).toBe(1.73); // 7.88 × 0.22
      expect(result.total).toBe(167.11); // 157.5 + 7.88 + 1.73
      expect(result.breakdownLabel).toBe('7h × €3.75/h × 6 persone');
    });

    it('should handle single guest correctly', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 3.5,
        pricePerHour: 15,
        pricePerDay: 100,
        guestsCount: 1
      });

      expect(result.base).toBe(52.5); // 3.5 × 15 × 1
      expect(result.serviceFee).toBe(2.63);
      expect(result.vat).toBe(0.58);
      expect(result.total).toBe(55.71);
      expect(result.breakdownLabel).toBe('3.5h × €15/h × 1 persona');
    });

    it('should handle 10 guests correctly', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 5,
        pricePerHour: 10,
        pricePerDay: 80,
        guestsCount: 10
      });

      expect(result.base).toBe(500); // 5h × €10 × 10
      expect(result.serviceFee).toBe(25); // 500 × 0.05
      expect(result.vat).toBe(5.5); // 25 × 0.22
      expect(result.total).toBe(530.5); // 500 + 25 + 5.5
      expect(result.breakdownLabel).toBe('5h × €10/h × 10 persone');
    });
  });

  describe('daily pricing with multiple guests', () => {
    it('should multiply day rate by guest count', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 9,
        pricePerHour: 15,
        pricePerDay: 100,
        guestsCount: 6
      });

      expect(result.isDayRate).toBe(true);
      expect(result.base).toBe(600); // €100 × 6
      expect(result.serviceFee).toBe(30); // 600 × 0.05
      expect(result.vat).toBe(6.6); // 30 × 0.22
      expect(result.total).toBe(636.6); // 600 + 30 + 6.6
      expect(result.breakdownLabel).toBe('Tariffa giornaliera (9h) × 6 persone');
    });

    it('should handle single guest day rate', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 8,
        pricePerHour: 15,
        pricePerDay: 100,
        guestsCount: 1
      });

      expect(result.isDayRate).toBe(true);
      expect(result.base).toBe(100); // €100 × 1
      expect(result.breakdownLabel).toBe('Tariffa giornaliera (8h) × 1 persona');
    });
  });

  describe('edge cases', () => {
    it('should handle 2 guests correctly', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 4,
        pricePerHour: 20,
        pricePerDay: 140,
        guestsCount: 2
      });

      expect(result.base).toBe(160); // 4h × €20 × 2
      expect(result.breakdownLabel).toBe('4h × €20/h × 2 persone');
    });

    it('should handle high capacity (50 guests)', () => {
      const result = computePricing({
        ...baseInput,
        durationHours: 3,
        pricePerHour: 5,
        pricePerDay: 40,
        guestsCount: 50
      });

      expect(result.base).toBe(750); // 3h × €5 × 50
      expect(result.serviceFee).toBe(37.5);
      expect(result.vat).toBe(8.25);
      expect(result.total).toBe(795.75);
    });
  });
});
