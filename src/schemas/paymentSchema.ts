
import { z } from 'zod';

// Stripe checkout session creation
export const CheckoutSessionSchema = z.object({
  booking_id: z.string().uuid("ID prenotazione non valido"),
  price_id: z.string()
    .startsWith("price_", "Price ID Stripe non valido")
    .optional(),
  success_url: z.string().url("URL successo non valido").optional(),
  cancel_url: z.string().url("URL cancellazione non valido").optional(),
  metadata: z.record(z.string()).optional(),
});

// Payment status update
export const PaymentStatusUpdateSchema = z.object({
  payment_id: z.string().uuid("ID pagamento non valido"),
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded', 'refund_pending'], {
    errorMap: () => ({ message: "Stato pagamento non valido" })
  }),
  stripe_session_id: z.string().optional(),
  receipt_url: z.string().url("URL ricevuta non valido").optional(),
});

// Refund request
export const RefundRequestSchema = z.object({
  payment_id: z.string().uuid("ID pagamento non valido"),
  amount: z.number()
    .min(0, "Importo deve essere >= 0")
    .optional(), // Se non specificato, rimborso completo
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer'], {
    errorMap: () => ({ message: "Motivo rimborso non valido" })
  }),
  notes: z.string()
    .max(500, "Note troppo lunghe (max 500 caratteri)")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Payout configuration (for hosts)
export const PayoutConfigSchema = z.object({
  currency: z.enum(['EUR', 'USD', 'GBP'], {
    errorMap: () => ({ message: "Valuta non supportata" })
  }).default('EUR'),
  minimum_payout: z.number()
    .min(10, "Importo minimo payout: €10")
    .max(10000, "Importo massimo payout: €10000")
    .default(50),
  payout_frequency: z.enum(['daily', 'weekly', 'monthly'], {
    errorMap: () => ({ message: "Frequenza non valida" })
  }).default('weekly'),
});

// Payment method validation
export const PaymentMethodSchema = z.object({
  type: z.enum(['card', 'bank_transfer', 'paypal'], {
    errorMap: () => ({ message: "Metodo pagamento non valido" })
  }),
  provider: z.string().max(50, "Provider troppo lungo"),
  last4: z.string()
    .length(4, "Last4 deve essere 4 cifre")
    .regex(/^\d{4}$/, "Last4 deve contenere solo numeri")
    .optional(),
  brand: z.string().max(50, "Brand troppo lungo").optional(),
});

// Payment verification
export const PaymentVerificationSchema = z.object({
  session_id: z.string()
    .startsWith("cs_", "Session ID Stripe non valido"),
  booking_id: z.string().uuid("ID prenotazione non valido"),
});

// Stripe Connect onboarding
export const StripeConnectOnboardingSchema = z.object({
  return_url: z.string().url("URL ritorno non valido"),
  refresh_url: z.string().url("URL refresh non valido"),
  account_type: z.enum(['individual', 'company'], {
    errorMap: () => ({ message: "Tipo account non valido" })
  }).default('individual'),
});

// Payment breakdown calculation
export const PaymentBreakdownSchema = z.object({
  total_amount: z.number().min(0, "Importo totale deve essere >= 0"),
  platform_fee_percentage: z.number()
    .min(0, "Fee percentuale deve essere >= 0")
    .max(100, "Fee percentuale deve essere <= 100")
    .default(5),
  stripe_fee_percentage: z.number()
    .min(0, "Stripe fee deve essere >= 0")
    .max(10, "Stripe fee deve essere <= 10")
    .default(1.5),
  vat_percentage: z.number()
    .min(0, "IVA deve essere >= 0")
    .max(30, "IVA deve essere <= 30")
    .default(22),
});

// Export types
export type CheckoutSessionData = z.infer<typeof CheckoutSessionSchema>;
export type PaymentStatusUpdateData = z.infer<typeof PaymentStatusUpdateSchema>;
export type RefundRequestData = z.infer<typeof RefundRequestSchema>;
export type PayoutConfigData = z.infer<typeof PayoutConfigSchema>;
export type PaymentMethodData = z.infer<typeof PaymentMethodSchema>;
export type PaymentVerificationData = z.infer<typeof PaymentVerificationSchema>;
export type StripeConnectOnboardingData = z.infer<typeof StripeConnectOnboardingSchema>;
export type PaymentBreakdownData = z.infer<typeof PaymentBreakdownSchema>;
