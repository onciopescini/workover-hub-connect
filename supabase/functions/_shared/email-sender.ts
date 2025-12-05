// @ts-ignore
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const DEFAULT_FROM = 'Workover <noreply@workover.it.com>';
const DEFAULT_REPLY_TO = 'support@workover.it.com';

/**
 * Send an email using Resend
 * @param options Email options
 * @returns Result object with success status
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const startTime = Date.now();
  
  try {
    console.log('[EMAIL] Sending email', {
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      timestamp: new Date().toISOString()
    });

    const { data, error } = await resend.emails.send({
      from: options.from || DEFAULT_FROM,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo || DEFAULT_REPLY_TO,
    });

    const duration = Date.now() - startTime;

    if (error) {
      console.error('[EMAIL] Failed to send email', {
        error: error.message,
        to: options.to,
        subject: options.subject,
        duration: `${duration}ms`
      });
      
      return {
        success: false,
        error: error.message
      };
    }

    console.log('[EMAIL] Email sent successfully', {
      messageId: data?.id,
      to: options.to,
      subject: options.subject,
      duration: `${duration}ms`
    });

    return {
      success: true,
      messageId: data?.id
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('[EMAIL] Unexpected error sending email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
      subject: options.subject,
      duration: `${duration}ms`
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send email with retry logic for transient failures
 * @param options Email options
 * @param maxRetries Maximum number of retries (default: 2)
 * @returns Result object with success status
 */
export async function sendEmailWithRetry(
  options: EmailOptions,
  maxRetries: number = 2
): Promise<EmailResult> {
  let lastError: string | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`[EMAIL] Retry attempt ${attempt}/${maxRetries} after ${backoffMs}ms`, {
        subject: options.subject
      });
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }

    const result = await sendEmail(options);
    
    if (result.success) {
      if (attempt > 0) {
        console.log('[EMAIL] Email sent successfully after retry', {
          attempt,
          subject: options.subject
        });
      }
      return result;
    }

    lastError = result.error;
    
    // Don't retry for certain errors
    if (result.error?.includes('Invalid email') || result.error?.includes('Invalid API key')) {
      console.log('[EMAIL] Non-retryable error detected, aborting', {
        error: result.error
      });
      break;
    }
  }

  return {
    success: false,
    error: lastError || 'Failed after all retry attempts'
  };
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if Resend API key is configured
 */
export function isEmailConfigured(): boolean {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  return !!apiKey && apiKey.length > 0;
}
