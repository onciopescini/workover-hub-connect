import { PricingEngine } from './pricing-engine';

describe('PricingEngine', () => {
  describe('calculatePricing', () => {

    test('Standard Case: €100 Base Price', () => {
      // 1. Setup
      const basePrice = 100.00;

      // 2. Execute
      const result = PricingEngine.calculatePricing(basePrice);

      // 3. Verify
      expect(result.basePrice).toBe(100.00);

      // Guest Side
      // Fee: 5% of 100 = 5.00
      expect(result.guestFee).toBe(5.00);
      // VAT: 22% of 5.00 = 1.10
      expect(result.guestVat).toBe(1.10);
      // Total: 100 + 5 + 1.10 = 106.10
      expect(result.totalGuestPay).toBe(106.10);

      // Host Side
      // Fee: 5% of 100 = 5.00
      expect(result.hostFee).toBe(5.00);
      // Payout: 100 - 5.00 = 95.00
      expect(result.hostPayout).toBe(95.00);

      // Platform Revenue
      // App Fee = Total Guest Pay - Host Payout = 106.10 - 95.00 = 11.10
      // Also = Guest Fee (5.00) + VAT (1.10) + Host Fee (5.00) = 11.10
      expect(result.applicationFee).toBe(11.10);
    });

    test('Minimum Fee Case: €5.00 Base Price', () => {
      // 1. Setup
      const basePrice = 5.00;

      // 2. Execute
      const result = PricingEngine.calculatePricing(basePrice);

      // 3. Verify
      // Guest Fee Raw: 5 * 0.05 = 0.25. Floor is 0.50.
      expect(result.guestFee).toBe(0.50);

      // VAT: 0.50 * 0.22 = 0.11
      expect(result.guestVat).toBe(0.11);

      // Total: 5.00 + 0.50 + 0.11 = 5.61
      expect(result.totalGuestPay).toBe(5.61);

      // Host Fee: 5 * 0.05 = 0.25 (No floor for host)
      expect(result.hostFee).toBe(0.25);

      // Payout: 5.00 - 0.25 = 4.75
      expect(result.hostPayout).toBe(4.75);

      // App Fee: 5.61 - 4.75 = 0.86
      // Check: Guest Fee (0.50) + VAT (0.11) + Host Fee (0.25) = 0.86
      expect(result.applicationFee).toBe(0.86);
    });

    test('Decimal Rounding Case: €12.50 Base Price', () => {
      // 1. Setup
      const basePrice = 12.50;

      // 2. Execute
      const result = PricingEngine.calculatePricing(basePrice);

      // 3. Verify
      // Guest Fee: 12.50 * 0.05 = 0.625 -> Rounds to 0.63
      expect(result.guestFee).toBe(0.63);

      // VAT: 0.63 * 0.22 = 0.1386 -> Rounds to 0.14
      expect(result.guestVat).toBe(0.14);

      // Total: 12.50 + 0.63 + 0.14 = 13.27
      expect(result.totalGuestPay).toBe(13.27);

      // Host Fee: 12.50 * 0.05 = 0.625 -> Rounds to 0.63
      expect(result.hostFee).toBe(0.63);

      // Host Payout: 12.50 - 0.63 = 11.87
      expect(result.hostPayout).toBe(11.87);

      // App Fee: 13.27 - 11.87 = 1.40
      // Check: Guest Fee (0.63) + VAT (0.14) + Host Fee (0.63) = 1.40
      expect(result.applicationFee).toBe(1.40);
    });

    test('Zero Price Case', () => {
      // 1. Setup
      const basePrice = 0;

      // 2. Execute
      const result = PricingEngine.calculatePricing(basePrice);

      // 3. Verify
      // Fee floor applies
      expect(result.guestFee).toBe(0.50);
      expect(result.guestVat).toBe(0.11);
      expect(result.totalGuestPay).toBe(0.61);

      expect(result.hostFee).toBe(0.00);
      expect(result.hostPayout).toBe(0.00);
      expect(result.applicationFee).toBe(0.61);
    });

    test('Financial Integrity: Application Fee Calculation Check', () => {
      // Run a loop of random prices to ensure the equation holds true
      for (let i = 0; i < 50; i++) {
        const randomPrice = Math.round(Math.random() * 500 * 100) / 100; // 0.00 to 500.00
        const result = PricingEngine.calculatePricing(randomPrice);

        const calculatedAppFee = parseFloat((result.totalGuestPay - result.hostPayout).toFixed(2));

        expect(result.applicationFee).toBe(calculatedAppFee);

        // Also verify the component sum
        const componentSum = parseFloat((result.guestFee + result.guestVat + result.hostFee).toFixed(2));
        expect(result.applicationFee).toBe(componentSum);
      }
    });
  });
});
