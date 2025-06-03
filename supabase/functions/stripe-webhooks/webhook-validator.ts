
import Stripe from "https://esm.sh/stripe@15.0.0";

export interface WebhookValidationResult {
  success: boolean;
  event?: Stripe.Event;
  error?: string;
}

export async function validateWebhookSignature(
  req: Request,
  stripe: Stripe,
  webhookSecret: string
): Promise<WebhookValidationResult> {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return { success: false, error: 'Missing signature' };
  }

  if (!webhookSecret) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable');
    return { success: false, error: 'Webhook secret not configured' };
  }

  console.log('🔵 Validating webhook signature...');

  try {
    // Fix: Read raw body as ArrayBuffer to preserve exact bytes for signature validation
    const rawBody = await req.arrayBuffer();
    const body = new TextDecoder("utf-8").decode(rawBody);

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Webhook signature validated successfully');
    
    return { success: true, event };
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    console.error('Debug info:', {
      bodyLength: body?.length || 0,
      signaturePresent: !!signature,
      secretConfigured: !!webhookSecret
    });
    return { success: false, error: 'Invalid signature' };
  }
}
