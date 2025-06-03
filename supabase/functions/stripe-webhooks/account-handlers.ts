
import Stripe from "https://esm.sh/stripe@15.0.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function handleAccountUpdated(
  account: Stripe.Account,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  console.log('🔵 Stripe account updated:', account.id);
  
  // Check if account is verified and can accept payments
  const isVerified = account.charges_enabled && account.payouts_enabled;
  
  console.log('🔵 Account verification status:', {
    id: account.id,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    isVerified
  });
  
  // Find and update host profile by stripe_account_id
  const { data: profiles, error: findError } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('stripe_account_id', account.id);

  if (findError) {
    console.error('🔴 Error finding profile by stripe_account_id:', findError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('🔴 No profile found for Stripe account:', account.id);
    return;
  }

  const profile = profiles[0];
  console.log('🔵 Updating profile for user:', profile.id, 'isVerified:', isVerified);

  // Update the stripe_connected status - FIX PRINCIPALE
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ 
      stripe_connected: isVerified,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('🔴 Error updating host stripe status:', updateError);
  } else {
    console.log('✅ Host stripe status updated successfully:', {
      userId: profile.id,
      stripeConnected: isVerified
    });

    // Send notification email to host about successful setup
    if (isVerified) {
      try {
        // Get user email from auth
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
          console.log('✅ Stripe setup completion email sent');
        }
      } catch (emailError) {
        console.error('🔴 Failed to send Stripe setup completion email:', emailError);
      }
    }
  }
}
