// Mock Stripe types for testing
type StripeEvent = {
  id: string;
  object: string;
  api_version: string;
  created: number;
  type: string;
  data: {
    object: any;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: { id: string | null; idempotency_key: string | null };
};

export const mockStripeWebhooks = {
  checkout_completed: (sessionId: string, amount: number, metadata: Record<string, string>): StripeEvent => ({
    id: `evt_mock_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        amount_total: amount,
        currency: 'eur',
        customer: 'cus_mock',
        payment_status: 'paid',
        status: 'complete',
        metadata,
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  }),

  charge_succeeded: (chargeId: string, amount: number, paymentIntent: string): StripeEvent => ({
    id: `evt_mock_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'charge.succeeded',
    data: {
      object: {
        id: chargeId,
        object: 'charge',
        amount,
        currency: 'eur',
        payment_intent: paymentIntent,
        payment_method_details: {
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
          },
        },
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  }),

  refund_created: (refundId: string, amount: number, paymentIntent: string, metadata?: Record<string, string>): StripeEvent => ({
    id: `evt_mock_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'refund.created',
    data: {
      object: {
        id: refundId,
        object: 'refund',
        amount,
        currency: 'eur',
        payment_intent: paymentIntent,
        status: 'succeeded',
        metadata: metadata || {},
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  }),

  transfer_created: (transferId: string, amount: number, destination: string, metadata?: Record<string, string>): StripeEvent => ({
    id: `evt_mock_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'transfer.created',
    data: {
      object: {
        id: transferId,
        object: 'transfer',
        amount,
        currency: 'eur',
        destination,
        metadata: metadata || {},
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  }),

  payout_created: (payoutId: string, amount: number): StripeEvent => ({
    id: `evt_mock_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'payout.created',
    data: {
      object: {
        id: payoutId,
        object: 'payout',
        amount,
        currency: 'eur',
        status: 'in_transit',
        arrival_date: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  }),
};
