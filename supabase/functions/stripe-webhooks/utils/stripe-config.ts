
import Stripe from "https://esm.sh/stripe@15.0.0";

export class StripeConfig {
  private static instance: Stripe;

  static getInstance(): Stripe {
    if (!this.instance) {
      this.instance = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
        apiVersion: '2023-10-16',
      });
    }
    return this.instance;
  }

  static getWebhookSecret(): string {
    const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable not configured');
    }
    return secret;
  }
}
