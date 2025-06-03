
import Stripe from "https://esm.sh/stripe@15.0.0";
import { ProfileService } from "../services/profile-service.ts";
import { ErrorHandler } from "../utils/error-handler.ts";
import { Validators } from "../utils/validators.ts";
import type { EventHandlerResult } from "../types/webhook-types.ts";

export class AccountHandlers {
  static async handleAccountUpdated(
    account: Stripe.Account,
    supabaseAdmin: any
  ): Promise<EventHandlerResult> {
    ErrorHandler.logInfo('Stripe account updated', { accountId: account.id });
    
    if (!Validators.validateAccountVerification(account)) {
      return { success: false, error: 'Invalid account data' };
    }
    
    // Check if account is verified
    const isVerified = account.charges_enabled && account.payouts_enabled;
    
    ErrorHandler.logInfo('Account verification status', {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      isVerified
    });
    
    // Find profile by stripe_account_id
    const profile = await ProfileService.getProfileByStripeAccount(supabaseAdmin, account.id);
    if (!profile) {
      return { success: false, error: 'Profile not found for Stripe account' };
    }

    ErrorHandler.logInfo('Updating profile for user', { userId: profile.id, isVerified });

    // Update stripe_connected status
    const profileUpdated = await ProfileService.updateStripeStatus(supabaseAdmin, profile.id, isVerified);
    if (!profileUpdated) {
      return { success: false, error: 'Failed to update profile' };
    }

    // Send setup completion email if verified
    if (isVerified) {
      await ProfileService.sendStripeSetupEmail(supabaseAdmin, profile);
    }

    return { success: true, message: 'Account update processed successfully' };
  }
}
