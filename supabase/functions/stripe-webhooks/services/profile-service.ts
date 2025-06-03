
import { ErrorHandler } from "../utils/error-handler.ts";
import type { HostProfile } from "../types/domain-types.ts";

export class ProfileService {
  static async getHostProfile(supabaseAdmin: any, hostId: string): Promise<HostProfile | null> {
    try {
      const { data: hostProfile, error } = await supabaseAdmin
        .from('profiles')
        .select('stripe_account_id, stripe_connected')
        .eq('id', hostId)
        .single();

      if (error) {
        ErrorHandler.logError('Error fetching host profile', error);
        return null;
      }

      return hostProfile;
    } catch (error) {
      ErrorHandler.logError('Profile service error', error);
      return null;
    }
  }

  static async getProfileByStripeAccount(supabaseAdmin: any, stripeAccountId: string): Promise<any | null> {
    try {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('stripe_account_id', stripeAccountId);

      if (error) {
        ErrorHandler.logError('Error finding profile by stripe_account_id', error);
        return null;
      }

      if (!profiles || profiles.length === 0) {
        ErrorHandler.logWarning('No profile found for Stripe account', { stripeAccountId });
        return null;
      }

      return profiles[0];
    } catch (error) {
      ErrorHandler.logError('Error fetching profile', error);
      return null;
    }
  }

  static async updateStripeStatus(supabaseAdmin: any, profileId: string, isVerified: boolean): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          stripe_connected: isVerified,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) {
        ErrorHandler.logError('Error updating host stripe status', error);
        return false;
      }

      ErrorHandler.logSuccess('Host stripe status updated successfully', {
        userId: profileId,
        stripeConnected: isVerified
      });

      return true;
    } catch (error) {
      ErrorHandler.logError('Error updating profile', error);
      return false;
    }
  }

  static async sendStripeSetupEmail(supabaseAdmin: any, profile: any): Promise<void> {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      
      if (authUser?.user?.email) {
        await supabaseAdmin.functions.invoke('send-email', {
          body: {
            type: 'stripe_setup_complete',
            to: authUser.user.email,
            data: {
              firstName: profile.first_name,
              dashboardUrl: `${Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://workover.app'}/host/dashboard`
            }
          }
        });
        ErrorHandler.logSuccess('Stripe setup completion email sent');
      }
    } catch (error) {
      ErrorHandler.logError('Failed to send Stripe setup completion email', error);
    }
  }
}
