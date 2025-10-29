import { describe, it, expect } from '@jest/globals';

describe('Payment Calculations - Dual Commission Model', () => {
  const calculatePayment = (basePrice: number) => {
    const buyerFee = Math.round(basePrice * 0.05 * 100) / 100;
    const hostFee = Math.round(basePrice * 0.05 * 100) / 100;
    const buyerTotal = basePrice + buyerFee;
    const hostPayout = basePrice - hostFee;
    const platformRevenue = buyerFee + hostFee;
    
    return {
      buyerFee,
      hostFee,
      buyerTotal,
      hostPayout,
      platformRevenue
    };
  };

  it('calculates correct buyer fee (5%)', () => {
    const result = calculatePayment(100);
    expect(result.buyerFee).toBe(5.00);
  });

  it('calculates correct host fee (5%)', () => {
    const result = calculatePayment(100);
    expect(result.hostFee).toBe(5.00);
  });

  it('calculates correct buyer total (base + 5%)', () => {
    const result = calculatePayment(100);
    expect(result.buyerTotal).toBe(105.00);
  });

  it('calculates correct host payout (base - 5%)', () => {
    const result = calculatePayment(100);
    expect(result.hostPayout).toBe(95.00);
  });

  it('calculates correct platform revenue (10% total)', () => {
    const result = calculatePayment(100);
    expect(result.platformRevenue).toBe(10.00);
  });

  it('handles decimal prices correctly', () => {
    const result = calculatePayment(75.50);
    expect(result.buyerFee).toBe(3.78);
    expect(result.hostFee).toBe(3.78);
    expect(result.platformRevenue).toBe(7.56);
  });

  it('handles large amounts', () => {
    const result = calculatePayment(1000);
    expect(result.buyerTotal).toBe(1050.00);
    expect(result.hostPayout).toBe(950.00);
    expect(result.platformRevenue).toBe(100.00);
  });

  it('maintains accuracy for all test cases', () => {
    const testCases = [20, 75, 150, 500];
    
    testCases.forEach(price => {
      const result = calculatePayment(price);
      
      // Platform revenue should always be 10% of base
      const expectedPlatformFee = price * 0.10;
      expect(Math.abs(result.platformRevenue - expectedPlatformFee)).toBeLessThan(0.01);
      
      // Buyer total should equal host payout + platform revenue
      expect(Math.abs(result.buyerTotal - (result.hostPayout + result.platformRevenue))).toBeLessThan(0.01);
    });
  });
});

describe('Stripe Amount Conversion', () => {
  const toStripeCents = (euros: number): number => {
    return Math.round(euros * 100);
  };

  it('converts euros to cents correctly', () => {
    expect(toStripeCents(100)).toBe(10000);
    expect(toStripeCents(75.50)).toBe(7550);
    expect(toStripeCents(20)).toBe(2000);
  });

  it('handles decimal precision', () => {
    expect(toStripeCents(105.00)).toBe(10500);
    expect(toStripeCents(95.00)).toBe(9500);
  });

  it('validates Stripe session amounts', () => {
    const basePrice = 100;
    const buyerTotal = basePrice * 1.05; // 105
    const stripeAmount = toStripeCents(buyerTotal);
    
    expect(stripeAmount).toBe(10500);
  });

  it('validates Stripe transfer amounts', () => {
    const basePrice = 100;
    const hostPayout = basePrice * 0.95; // 95
    const stripeTransfer = toStripeCents(hostPayout);
    
    expect(stripeTransfer).toBe(9500);
  });

  it('validates Stripe application fee', () => {
    const basePrice = 100;
    const hostFee = basePrice * 0.05; // 5
    const stripeFee = toStripeCents(hostFee);
    
    expect(stripeFee).toBe(500);
  });
});

describe('Currency Rounding', () => {
  const validateCurrencyRounding = (amount: number): boolean => {
    const rounded = Math.round(amount * 100) / 100;
    return amount === rounded;
  };

  it('validates 2 decimal places', () => {
    expect(validateCurrencyRounding(105.00)).toBe(true);
    expect(validateCurrencyRounding(95.00)).toBe(true);
    expect(validateCurrencyRounding(10.50)).toBe(true);
  });

  it('rejects more than 2 decimal places', () => {
    expect(validateCurrencyRounding(105.001)).toBe(false);
    expect(validateCurrencyRounding(95.999)).toBe(false);
  });
});
