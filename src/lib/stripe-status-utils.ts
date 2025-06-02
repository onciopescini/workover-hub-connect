
import { supabase } from "@/integrations/supabase/client";

export const checkAndUpdateStripeStatus = async (userId: string): Promise<boolean> => {
  try {
    console.log('🔵 Checking Stripe status for user:', userId);
    
    const { data, error } = await supabase.functions.invoke('check-stripe-status');
    
    if (error) {
      console.error('🔴 Error checking Stripe status:', error);
      return false;
    }
    
    console.log('🔵 Stripe status check result:', data);
    return data?.connected || false;
  } catch (error) {
    console.error('🔴 Error in checkAndUpdateStripeStatus:', error);
    return false;
  }
};

export const fixCurrentStripeIssue = async (): Promise<void> => {
  try {
    console.log('🔵 Running one-time Stripe status fix...');
    
    const { data, error } = await supabase.functions.invoke('fix-stripe-status');
    
    if (error) {
      console.error('🔴 Error fixing Stripe status:', error);
      return;
    }
    
    console.log('✅ Stripe status fix completed:', data);
  } catch (error) {
    console.error('🔴 Error in fixCurrentStripeIssue:', error);
  }
};
