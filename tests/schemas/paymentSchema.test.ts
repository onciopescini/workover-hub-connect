import {
  CheckoutSessionSchema,
  PaymentStatusUpdateSchema,
  RefundRequestSchema,
  PayoutConfigSchema,
  PaymentMethodSchema,
  PaymentVerificationSchema,
  StripeConnectOnboardingSchema,
  PaymentBreakdownSchema,
} from '@/schemas/paymentSchema';
import {
  createMockCheckoutSession,
  createMockRefundRequest,
  createMockPayoutConfig,
  createInvalidUuid,
  createInvalidUrl,
  createTooLongString,
} from '../factories/mockData';

describe('Payment Schemas', () => {
  describe('CheckoutSessionSchema', () => {
    it('should validate minimal checkout session', () => {
      const validData = createMockCheckoutSession();
      const result = CheckoutSessionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate complete checkout session with all fields', () => {
      const data = createMockCheckoutSession({
        price_id: 'price_1234567890',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: { order_id: '123' },
      });
      const result = CheckoutSessionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid booking_id', () => {
      const data = createMockCheckoutSession({
        booking_id: createInvalidUuid(),
      });
      const result = CheckoutSessionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject price_id not starting with price_', () => {
      const data = createMockCheckoutSession({ price_id: 'invalid_123' });
      const result = CheckoutSessionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid success_url', () => {
      const data = createMockCheckoutSession({
        success_url: createInvalidUrl(),
      });
      const result = CheckoutSessionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('PaymentStatusUpdateSchema', () => {
    it('should validate all payment statuses', () => {
      const statuses = [
        'pending',
        'completed',
        'failed',
        'refunded',
        'refund_pending',
      ] as const;
      statuses.forEach(payment_status => {
        const data = {
          payment_id: '123e4567-e89b-12d3-a456-426614174000',
          payment_status,
        };
        const result = PaymentStatusUpdateSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      const data = {
        payment_id: '123e4567-e89b-12d3-a456-426614174000',
        payment_status: 'invalid',
      };
      const result = PaymentStatusUpdateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid receipt_url', () => {
      const data = {
        payment_id: '123e4567-e89b-12d3-a456-426614174000',
        payment_status: 'completed' as const,
        receipt_url: createInvalidUrl(),
      };
      const result = PaymentStatusUpdateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('RefundRequestSchema', () => {
    it('should validate complete refund request', () => {
      const validData = createMockRefundRequest();
      const result = RefundRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate refund without amount (full refund)', () => {
      const data = createMockRefundRequest({ amount: undefined });
      const result = RefundRequestSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate all refund reasons', () => {
      const reasons = [
        'duplicate',
        'fraudulent',
        'requested_by_customer',
      ] as const;
      reasons.forEach(reason => {
        const data = createMockRefundRequest({ reason });
        const result = RefundRequestSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject negative amount', () => {
      const data = createMockRefundRequest({ amount: -10 });
      const result = RefundRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject notes exceeding 500 characters', () => {
      const data = createMockRefundRequest({
        notes: createTooLongString(500),
      });
      const result = RefundRequestSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('PayoutConfigSchema', () => {
    it('should validate complete payout config', () => {
      const validData = createMockPayoutConfig();
      const result = PayoutConfigSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const data = {};
      const result = PayoutConfigSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('EUR');
        expect(result.data.minimum_payout).toBe(50);
        expect(result.data.payout_frequency).toBe('weekly');
      }
    });

    it('should validate all currencies', () => {
      const currencies = ['EUR', 'USD', 'GBP'] as const;
      currencies.forEach(currency => {
        const data = createMockPayoutConfig({ currency });
        const result = PayoutConfigSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate all payout frequencies', () => {
      const frequencies = ['daily', 'weekly', 'monthly'] as const;
      frequencies.forEach(payout_frequency => {
        const data = createMockPayoutConfig({ payout_frequency });
        const result = PayoutConfigSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject minimum_payout less than 10', () => {
      const data = createMockPayoutConfig({ minimum_payout: 5 });
      const result = PayoutConfigSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject minimum_payout greater than 10000', () => {
      const data = createMockPayoutConfig({ minimum_payout: 10001 });
      const result = PayoutConfigSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('PaymentMethodSchema', () => {
    it('should validate card payment method', () => {
      const data = {
        type: 'card' as const,
        provider: 'Stripe',
        last4: '4242',
        brand: 'Visa',
      };
      const result = PaymentMethodSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate all payment types', () => {
      const types = ['card', 'bank_transfer', 'paypal'] as const;
      types.forEach(type => {
        const data = { type, provider: 'Provider' };
        const result = PaymentMethodSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid last4 format', () => {
      const data = {
        type: 'card' as const,
        provider: 'Stripe',
        last4: '42A2',
      };
      const result = PaymentMethodSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject last4 not 4 digits', () => {
      const data = {
        type: 'card' as const,
        provider: 'Stripe',
        last4: '42',
      };
      const result = PaymentMethodSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('PaymentVerificationSchema', () => {
    it('should validate payment verification', () => {
      const data = {
        session_id: 'cs_test_1234567890',
        booking_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = PaymentVerificationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject session_id not starting with cs_', () => {
      const data = {
        session_id: 'invalid_1234567890',
        booking_id: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = PaymentVerificationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('StripeConnectOnboardingSchema', () => {
    it('should validate Stripe Connect onboarding', () => {
      const data = {
        return_url: 'https://example.com/return',
        refresh_url: 'https://example.com/refresh',
        account_type: 'individual' as const,
      };
      const result = StripeConnectOnboardingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should use default account_type', () => {
      const data = {
        return_url: 'https://example.com/return',
        refresh_url: 'https://example.com/refresh',
      };
      const result = StripeConnectOnboardingSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.account_type).toBe('individual');
      }
    });

    it('should validate both account types', () => {
      const types = ['individual', 'company'] as const;
      types.forEach(account_type => {
        const data = {
          return_url: 'https://example.com/return',
          refresh_url: 'https://example.com/refresh',
          account_type,
        };
        const result = StripeConnectOnboardingSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('PaymentBreakdownSchema', () => {
    it('should validate payment breakdown with defaults', () => {
      const data = {
        total_amount: 100,
      };
      const result = PaymentBreakdownSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.platform_fee_percentage).toBe(5);
        expect(result.data.stripe_fee_percentage).toBe(1.5);
        expect(result.data.vat_percentage).toBe(22);
      }
    });

    it('should validate custom breakdown', () => {
      const data = {
        total_amount: 100,
        platform_fee_percentage: 10,
        stripe_fee_percentage: 2,
        vat_percentage: 20,
      };
      const result = PaymentBreakdownSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative total_amount', () => {
      const data = {
        total_amount: -100,
      };
      const result = PaymentBreakdownSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject platform_fee_percentage over 100', () => {
      const data = {
        total_amount: 100,
        platform_fee_percentage: 101,
      };
      const result = PaymentBreakdownSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
