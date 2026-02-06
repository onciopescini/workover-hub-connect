import { PricingEngine } from './pricing-engine';

describe('PricingEngine', () => {
  describe('calculatePricing', () => {
    it('should calculate fees correctly for a standard base price', () => {
      const basePrice = 100;
      const result = PricingEngine.calculatePricing(basePrice);

      expect(result.basePrice).toBe(100);

      // Guest Fee: 5% of 100 = 5.00
      expect(result.guestFee).toBe(5.00);

      // Guest VAT: 22% of 5.00 = 1.10
      expect(result.guestVat).toBe(1.10);

      // Total Guest Pay: 100 + 5.00 + 1.10 = 106.10
      expect(result.totalGuestPay).toBe(106.10);

      // Host Fee: 5% of 100 = 5.00
      expect(result.hostFee).toBe(5.00);

      // Host Payout: 100 - 5.00 - 1.10 = 93.90
      expect(result.hostPayout).toBe(93.90);

      // Application Fee: 106.10 - 93.90 = 12.20
      expect(result.applicationFee).toBe(12.20);
    });

    it('should apply minimum guest fee floor', () => {
      // Base price 5.00. 5% is 0.25, which is < MIN_GUEST_FEE (0.50)
      const basePrice = 5;
      const result = PricingEngine.calculatePricing(basePrice);

      expect(result.basePrice).toBe(5);
      expect(result.guestFee).toBe(0.50); // Floor applied

      // VAT on 0.50 = 0.11
      expect(result.guestVat).toBe(0.11);

      // Total: 5 + 0.50 + 0.11 = 5.61
      expect(result.totalGuestPay).toBe(5.61);

      // Host Fee: 5% of 5 = 0.25 (No floor for host)
      expect(result.hostFee).toBe(0.25);

      // Host Payout: 5 - 0.25 - 0.06 = 4.69
      expect(result.hostPayout).toBe(4.69);

      // App Fee: 5.61 - 4.69 = 0.92
      expect(result.applicationFee).toBe(0.92);
    });

    it('should handle rounding correctly (e.g., repeating decimals)', () => {
      // Base price 33.33
      const basePrice = 33.33;
      const result = PricingEngine.calculatePricing(basePrice);

      expect(result.basePrice).toBe(33.33);

      // Guest Fee: 33.33 * 0.05 = 1.6665 -> 1.67
      expect(result.guestFee).toBe(1.67);

      // Guest VAT: 1.67 * 0.22 = 0.3674 -> 0.37
      expect(result.guestVat).toBe(0.37);

      // Total: 33.33 + 1.67 + 0.37 = 35.37
      expect(result.totalGuestPay).toBe(35.37);

      // Host Fee: 33.33 * 0.05 = 1.6665 -> 1.67
      expect(result.hostFee).toBe(1.67);

      // Host Payout: 33.33 - 1.67 - 0.37 = 31.29
      expect(result.hostPayout).toBe(31.29);

      // App Fee: 35.37 - 31.29 = 4.08
      expect(result.applicationFee).toBe(4.08);
    });

    it('should handle large numbers correctly', () => {
      const basePrice = 10000;
      const result = PricingEngine.calculatePricing(basePrice);

      // Guest Fee: 500
      expect(result.guestFee).toBe(500);

      // VAT: 110
      expect(result.guestVat).toBe(110);

      // Total: 10610
      expect(result.totalGuestPay).toBe(10610);

      // Host Fee: 500
      expect(result.hostFee).toBe(500);

      // Payout: 9390
      expect(result.hostPayout).toBe(9390);

      // App Fee: 10610 - 9390 = 1220
      expect(result.applicationFee).toBe(1220);
    });
  });
});
