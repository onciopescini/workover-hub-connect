import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

export const checkAndUpdateStripeStatus = async (userId: string): Promise<boolean> => {
  try {
    sreLogger.info('Checking Stripe status for user', { userId });
    
    const { data, error } = await supabase.functions.invoke('check-stripe-status');
    
    if (error) {
      sreLogger.error('Error checking Stripe status', { userId }, error);
      return false;
    }
    
    sreLogger.info('Stripe status check result', { userId, connected: data?.connected });
    return data?.connected || false;
  } catch (error) {
    sreLogger.error('Error in checkAndUpdateStripeStatus', { userId }, error as Error);
    return false;
  }
};

export const fixCurrentStripeIssue = async (): Promise<void> => {
  try {
    sreLogger.info('Running one-time Stripe status fix');
    
    const { data, error } = await supabase.functions.invoke('fix-stripe-status');
    
    if (error) {
      sreLogger.error('Error fixing Stripe status', {}, error);
      return;
    }
    
    sreLogger.info('Stripe status fix completed', { result: data });
  } catch (error) {
    sreLogger.error('Error in fixCurrentStripeIssue', {}, error as Error);
  }
};
