export interface PricingInput {
  durationHours: number;
  pricePerHour: number;
  pricePerDay: number;
  serviceFeePct: number; // es. 0.12
  vatPct: number;        // es. 0.22 (placeholder se Stripe Tax off)
  stripeTaxEnabled?: boolean; // da env
}

export interface PricingOutput {
  base: number;          // oraria o giornaliera
  serviceFee: number;    // fee piattaforma
  vat: number;           // 0 se stripeTaxEnabled === true (calcola Stripe)
  total: number;
  isDayRate: boolean;
  breakdownLabel: string; // "3.5h × €15/h" o "Tariffa giornaliera (9h)"
}

const round = (n: number) => Math.round(n * 100) / 100;

export function computePricing(input: PricingInput): PricingOutput {
  const isDayRate = input.durationHours >= 8;
  const base = isDayRate ? input.pricePerDay : input.durationHours * input.pricePerHour;
  const serviceFee = round(base * input.serviceFeePct);
  const vat = input.stripeTaxEnabled ? 0 : round((base + serviceFee) * input.vatPct);
  const total = round(base + serviceFee + vat);
  
  return {
    base: round(base),
    serviceFee,
    vat,
    total,
    isDayRate,
    breakdownLabel: isDayRate
      ? `Tariffa giornaliera (${input.durationHours}h)`
      : `${input.durationHours}h × €${input.pricePerHour}/h`,
  };
}

// Environment variable helpers
export function getServiceFeePct(): number {
  return Number(import.meta.env['VITE_SERVICE_FEE_PCT']) || 0.12;
}

export function getDefaultVatPct(): number {
  return Number(import.meta.env['VITE_DEFAULT_VAT_PCT']) || 0.22;
}

export function isStripeTaxEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const override = window.localStorage.getItem('ENABLE_STRIPE_TAX');
    if (override === 'true') return true;
    if (override === 'false') return false;
  }
  return import.meta.env['ENABLE_STRIPE_TAX'] === 'true';
}