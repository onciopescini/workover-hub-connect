import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { checkAccountStatus } from '@/services/api/stripeService';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

export interface UseStripeStatusResult {
  isVerifying: boolean;
  manualRefresh: () => Promise<void>;
}

export const useStripeStatus = (): UseStripeStatusResult => {
  const { authState, refreshProfile } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  useEffect(() => {
    const verifyStripeStatus = async () => {
      // Only verify once per session and only if user has a Stripe account
      if (hasVerified || !authState.user || !authState.profile?.stripe_account_id) {
        return;
      }

      // Check if returning from Stripe onboarding
      const urlParams = new URLSearchParams(window.location.search);
      const isReturningFromStripe = urlParams.get('state') === 'success';

      // Only auto-verify if:
      // 1. User is returning from Stripe, OR
      // 2. User has Stripe account but shows as not connected
      const shouldVerify = isReturningFromStripe || 
        (authState.profile.stripe_account_id && !authState.profile.stripe_connected);

      if (!shouldVerify) {
        setHasVerified(true);
        return;
      }

      try {
        setIsVerifying(true);
        sreLogger.info('Verifying Stripe connection status', { 
          userId: authState.user.id,
          isReturningFromStripe 
        });

        const statusResult = await checkAccountStatus();

        if (!statusResult.success) {
          throw new Error(statusResult.error || 'Failed to check status');
        }

        sreLogger.info('Stripe status verification complete', { 
          userId: authState.user.id, 
          connected: statusResult.data?.connected,
          updated: statusResult.data?.updated
        });

        // Force complete profile refresh with cache invalidation
        if (statusResult.data?.updated || isReturningFromStripe) {
          // Wait for profile refresh to complete
          await refreshProfile();
          
          if (statusResult.data?.connected) {
            toast.success('Account Stripe collegato con successo!');
          }
        }

        // Clean up URL params if returning from Stripe
        if (isReturningFromStripe) {
          window.history.replaceState({}, '', window.location.pathname);
        }

        setHasVerified(true);
      } catch (error) {
        sreLogger.error('Failed to verify Stripe status', { 
          userId: authState.user.id 
        }, error as Error);
        setHasVerified(true); // Don't retry on error
      } finally {
        setIsVerifying(false);
      }
    };

    verifyStripeStatus();
  }, [authState.user, authState.profile?.stripe_account_id, authState.profile?.stripe_connected, hasVerified, refreshProfile]);

  const manualRefresh = async () => {
    if (!authState.user || !authState.profile?.stripe_account_id) {
      return;
    }

    try {
      setIsVerifying(true);
      const statusResult = await checkAccountStatus();

      if (!statusResult.success) {
        throw new Error(statusResult.error || 'Failed to check status');
      }

      if (statusResult.data?.updated) {
        await refreshProfile();
        toast.success('Status Stripe aggiornato');
      } else {
        toast.info('Lo status è già aggiornato');
      }
    } catch (error) {
      sreLogger.error('Manual Stripe refresh failed', { 
        userId: authState.user.id 
      }, error as Error);
      toast.error('Errore durante l\'aggiornamento dello status Stripe');
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    isVerifying,
    manualRefresh
  };
};
