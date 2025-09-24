
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
      // CRITICAL FIX: Preserve raw body for accurate signature validation
      const rawBody = await req.arrayBuffer();
      const bodyText = new TextDecoder("utf-8").decode(rawBody);

    ErrorHandler.logInfo('Webhook validation debug', {
        bodyLength: bodyText.length,
        hasSignature: !!signature,
        hasSecret: !!webhookSecret
      });

      // CRITICAL FIX: Use async version for Deno edge functions
      const event = await stripe.webhooks.constructEventAsync(bodyText, signature!, webhookSecret);
      
      if (!Validators.validateStripeEvent(event)) {
        return { success: false, error: 'Invalid event structure' };
      }

      ErrorHandler.logSuccess('Webhook signature validated successfully');
      return { success: true, event };
    } catch (err: any) {
      ErrorHandler.logError('Webhook signature verification failed', err, {
        errorMessage: err.message,
        errorType: err.name,
        signaturePresent: !!signature,
        secretConfigured: !!webhookSecret,
        requestHeaders: Object.fromEntries(req.headers.entries())
      });
      return { success: false, error: `Signature validation failed: ${err.message}` };
    }
  }
}
