
import Stripe from "https://esm.sh/stripe@15.0.0";
import { Validators } from "../utils/validators.ts";
import { ErrorHandler } from "../utils/error-handler.ts";
import type { WebhookValidationResult } from "../types/webhook-types.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export class WebhookValidator {
  static async validateWebhookSignature(
    req: Request,
    stripe: Stripe,
    webhookSecret: string
  ): Promise<WebhookValidationResult> {
    const signature = req.headers.get('stripe-signature');
    
    if (!Validators.validateWebhookSignature(signature)) {
      ErrorHandler.logError('Missing stripe-signature header', new Error('Missing signature'));
      
      // Fix 3.7: Create critical alarm for missing signature
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase.from('system_alarms').insert({
          alarm_type: 'webhook_verification_failed',
          severity: 'critical',
          title: 'Stripe webhook signature missing',
          message: 'Received webhook without stripe-signature header - possible security breach attempt',
          metadata: {
            ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            user_agent: req.headers.get('user-agent') || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (alarmError) {
        console.error('[WEBHOOK_VALIDATOR] Failed to create alarm:', alarmError);
      }
      
      return { success: false, error: 'Missing signature' };
    }

    if (!Validators.validateWebhookSecret(webhookSecret)) {
      ErrorHandler.logError('Missing STRIPE_WEBHOOK_SECRET environment variable', new Error('Missing webhook secret'));
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
      
      // Fix 3.7: Create critical alarm for failed signature verification
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabase.from('system_alarms').insert({
          alarm_type: 'webhook_verification_failed',
          severity: 'critical',
          title: 'Stripe webhook signature verification failed',
          message: `Signature validation error: ${err.message}`,
          metadata: {
            error_type: err.name,
            error_message: err.message,
            signature_present: !!signature,
            secret_configured: !!webhookSecret,
            ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      } catch (alarmError) {
        console.error('[WEBHOOK_VALIDATOR] Failed to create alarm:', alarmError);
      }
      
      return { success: false, error: `Signature validation failed: ${err.message}` };
    }
  }
}
