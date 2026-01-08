import Stripe from "https://esm.sh/stripe@15.0.0";
import { ErrorHandler } from "./error-handler.ts";

export class Validators {
  static validateWebhookSignature(signature: string | null): boolean {
    if (!signature) {
      ErrorHandler.logError('Missing stripe-signature header', null);
      return false;
    }
    return true;
  }

  static validateWebhookSecret(secret: string | null): boolean {
    if (!secret) {
      ErrorHandler.logError('Missing STRIPE_WEBHOOK_SECRET environment variable', null);
      return false;
    }
    return true;
  }

  static validateStripeEvent(event: Stripe.Event | null): boolean {
    if (!event || !event.type || !event.data) {
      ErrorHandler.logError('Invalid Stripe event structure', null);
      return false;
    }
    return true;
  }

  static validateBookingMetadata(metadata: any): boolean {
    if (!metadata) {
      ErrorHandler.logError('Missing session metadata', null);
      return false;
    }

    const requiredFields = ['booking_id', 'base_amount'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        ErrorHandler.logError(`Missing required metadata field: ${field}`, null);
        return false;
      }
    }

    return true;
  }

  static validateAccountVerification(account: Stripe.Account): boolean {
    if (!account || !account.id) {
      ErrorHandler.logError('Invalid account data', null);
      return false;
    }
    return true;
  }
}
