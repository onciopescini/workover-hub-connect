
import Stripe from "https://esm.sh/stripe@15.0.0";

export interface WebhookValidationResult {
  success: boolean;
  event?: Stripe.Event;
  error?: string;
}

export interface WebhookContext {
  stripe: Stripe;
  supabaseAdmin: any;
  webhookSecret: string;
}

export interface EventHandlerResult {
  success: boolean;
  message?: string;
  error?: string;
}
