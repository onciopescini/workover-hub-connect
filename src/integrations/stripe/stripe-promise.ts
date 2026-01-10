import { loadStripe } from '@stripe/stripe-js';
import { appConfig } from '@/config/app.config';
import { sreLogger } from '@/lib/sre-logger';

// Direct fallback to ensure import.meta.env is read even if appConfig is not updated in memory immediately (unlikely but safe)
const stripePublishableKey = appConfig.external.stripePublishableKey || import.meta.env['VITE_STRIPE_PUBLISHABLE_KEY'];

if (!stripePublishableKey) {
  sreLogger.error('Stripe publishable key is missing from configuration', {
    envVarPresent: !!import.meta.env['VITE_STRIPE_PUBLISHABLE_KEY'],
    configPresent: !!appConfig.external.stripePublishableKey
  });
}

// Ensure strict null check doesn't crash, but pass empty string if missing (will warn in console)
export const stripePromise = loadStripe(stripePublishableKey || '');

// Explicit verification check logic
if (import.meta.env.DEV) {
  if (!stripePublishableKey) {
    console.error('CRITICAL: VITE_STRIPE_PUBLISHABLE_KEY is not defined in environment variables.');
  }
}
