
import Stripe from "https://esm.sh/stripe@15.0.0";
import { Validators } from "../utils/validators.ts";
import { ErrorHandler } from "../utils/error-handler.ts";
import type { WebhookValidationResult } from "../types/webhook-types.ts";

export class WebhookValidator {
  static async validateWebhookSignature(
    req: Request,
    stripe: Stripe,
    webhookSecret: string
  ): Promise<WebhookValidationResult> {
    const signature = req.headers.get('stripe-signature');
    
    if (!Validators.validateWebhookSignature(signature)) {
      ErrorHandler.logError('Missing stripe-signature header');
      return { success: false, error: 'Missing signature' };
    }

    if (!Validators.validateWebhookSecret(webhookSecret)) {
      ErrorHandler.logError('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return { success: false, error: 'Webhook secret not configured' };
    }

    ErrorHandler.logInfo('Validating webhook signature...');

    try {
      const rawBody = await req.arrayBuffer();
      const body = new TextDecoder("utf-8").decode(rawBody);

      const event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
      
      if (!Validators.validateStripeEvent(event)) {
        return { success: false, error: 'Invalid event structure' };
      }

      ErrorHandler.logSuccess('Webhook signature validated successfully');
      return { success: true, event };
    } catch (err: any) {
      ErrorHandler.logError('Webhook signature verification failed', err, {
        signaturePresent: !!signature,
        secretConfigured: !!webhookSecret
      });
      return { success: false, error: 'Invalid signature' };
    }
  }
}
