import { PricingEngine } from './pricing-engine';

export interface PricingInput {
  durationHours: number;
  pricePerHour: number;
  pricePerDay: number;
  guestsCount: number;
  serviceFeePct?: number;
  vatPct?: number;
  stripeTaxEnabled?: boolean;
}

// Helper functions for pricing configuration
export function getServiceFeePct(): number {
  return PricingEngine.GUEST_FEE_PERCENT; // 0.05 (5%)
}

export function getDefaultVatPct(): number {
  return PricingEngine.VAT_RATE; // 0.22 (22%)
}

export function isStripeTaxEnabled(): boolean {
  return false; // Manual VAT calculation, not Stripe Tax
}

export interface PricingOutput {
  base: number;          // oraria o giornaliera
  serviceFee: number;    // fee piattaforma (include minimo €0.50)
  vat: number;           // IVA sulla fee (22% della fee)
  total: number;         // Totale a carico del Guest
  isDayRate: boolean;
  breakdownLabel: string; // "3.5h × €15/h" o "Tariffa giornaliera (9h)"
}

export function computePricing(input: PricingInput): PricingOutput {
  const isDayRate = input.durationHours >= 8;
  const basePerPerson = isDayRate ? input.pricePerDay : input.durationHours * input.pricePerHour;
  const base = basePerPerson * input.guestsCount;

  // Delegate all financial calculations to the Pricing Engine
  const pricing = PricingEngine.calculatePricing(base);
  
  const guestLabel = input.guestsCount === 1 ? 'persona' : 'persone';
  
  return {
    base: pricing.basePrice,
    serviceFee: pricing.guestFee,
    vat: pricing.guestVat,
    total: pricing.totalGuestPay,
    isDayRate,
    breakdownLabel: isDayRate
      ? `Tariffa giornaliera (${input.durationHours}h) × ${input.guestsCount} ${guestLabel}`
      : `${input.durationHours}h × €${input.pricePerHour}/h × ${input.guestsCount} ${guestLabel}`,
  };
}
