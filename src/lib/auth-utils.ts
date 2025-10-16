
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { AUTH_ERRORS, mapSupabaseError } from '@/utils/auth/auth-errors';

// Define proper types for rate limit responses
interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  message?: string;
}

export const cleanupAuthState = () => {
  logger.info('Starting auth state cleanup');
  
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });

  // Clear Google OAuth related storage
  Object.keys(localStorage).forEach((key) => {
    if (key.includes('google') || key.includes('oauth') || key.includes('gapi')) {
      localStorage.removeItem(key);
    }
  });

  logger.info('Auth state cleanup completed');
};

export const aggressiveSignOut = async () => {
  try {
    logger.info('Starting aggressive sign out');
    
    // Import here to avoid circular dependency
    const { getAuthSyncChannel } = await import('@/utils/auth/multi-tab-sync');
    const authSync = getAuthSyncChannel();
    
    // Broadcast logout to all tabs FIRST
    authSync.broadcastLogout();
    
    // Clean up auth state
    cleanupAuthState();
    
    // Attempt multiple sign out scopes
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      logger.warn('Global sign out failed', {}, err as Error);
    }

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      logger.warn('Local sign out failed', {}, err as Error);
    }

    // Additional cleanup - clear any remaining session data
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.warn('Standard sign out failed', {}, err as Error);
    }

    logger.info('Aggressive sign out completed');
    
    // Force page reload to ensure clean state
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
    
  } catch (error) {
    logger.error("Error in aggressive sign out", {}, error as Error);
    cleanupAuthState();
    window.location.href = '/';
  }
};

export const isValidLinkedInUrl = (url: string | null): boolean => {
  if (!url) return true; // null is valid (optional field)
  const linkedinRegex = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/.*/i;
  return linkedinRegex.test(url);
};

// Get counts of unread messages for a user
export const getUnreadMessagesCount = async (): Promise<number> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return 0;

    // Get all bookings where the user is either the coworker or the host
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, space:spaces(host_id)')
      .or(`user_id.eq.${user.user.id},spaces.host_id.eq.${user.user.id}`);

    if (!bookings || bookings.length === 0) return 0;

    // Get booking IDs
    const bookingIds = bookings.map(booking => booking.id);

    // Count unread messages in those bookings that weren't sent by the user
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', user.user.id)
      .in('booking_id', bookingIds);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    logger.error("Error getting unread message count", {}, error as Error); // TODO: Improve error type handling
    return 0;
  }
};

// Helper function to handle login with cleanup and force account picker
export const cleanSignInWithGoogle = async () => {
  try {
    logger.info('Starting clean Google sign in');
    
    // Clean up existing state first
    cleanupAuthState();
    
    // Attempt global sign out to clear any existing sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      logger.warn('Pre-login cleanup sign out failed', {}, err as Error); // TODO: Improve error type handling
    }
    
    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Now attempt Google sign in with forced account picker
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Force Google to show account picker even if user is already signed in
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline'
        }
      }
    });
    
    if (error) {
      if (error.message.includes('popup')) {
        throw new Error(AUTH_ERRORS.OAUTH_POPUP_BLOCKED);
      }
      throw new Error(mapSupabaseError(error));
    }
    
    logger.info('Google sign in initiated successfully');
    return data;
  } catch (error) {
    logger.error("Error in clean Google sign in", {}, error as Error); // TODO: Improve error type handling
    throw error;
  }
};

// Helper function to check rate limits before authentication
export const checkAuthRateLimit = async (action: 'login' | 'password_reset', identifier?: string): Promise<RateLimitResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('auth-rate-limit', {
      body: { action, identifier }
    });

    if (error) {
      logger.error('Rate limit check failed', { action, ...(identifier && { identifier }) }, error);
      // Fail closed - deny the request if rate limit check fails
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: Date.now() + 60000,
        message: 'Servizio temporaneamente non disponibile. Riprova più tardi.'
      };
    }

    return data as RateLimitResponse; // TODO: Add runtime validation for rate limit response
  } catch (error) {
    logger.error('Rate limit check error', { action, ...(identifier && { identifier }) }, error as Error); // TODO: Improve error type handling
    // Fail closed
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: Date.now() + 60000,
      message: 'Servizio temporaneamente non disponibile. Riprova più tardi.'
    };
  }
};

// Helper function to handle login with cleanup and rate limiting
export const cleanSignIn = async (email: string, password: string) => {
  try {
    // Check rate limit first
    const rateLimitResult = await checkAuthRateLimit('login');
    
    if (!rateLimitResult.allowed) {
      const waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      throw new Error(AUTH_ERRORS.RATE_LIMIT_EXCEEDED(waitTime));
    }

    // Clean up existing state first
    cleanupAuthState();
    
    // Attempt global sign out to clear any existing sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
    }
    
    // Now attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw new Error(mapSupabaseError(error));
    }
    return data;
  } catch (error) {
    logger.error("Error in clean sign in", { email }, error as Error); // TODO: Improve error type handling
    throw error;
  }
};

// Helper function to handle password reset with rate limiting
export const requestPasswordReset = async (email: string) => {
  try {
    // Check rate limit first
    const rateLimitResult = await checkAuthRateLimit('password_reset', email);
    
    if (!rateLimitResult.allowed) {
      const waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
      throw new Error(AUTH_ERRORS.RATE_LIMIT_EXCEEDED(waitTime));
    }

    // Proceed with password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    
    if (error) {
      throw new Error(mapSupabaseError(error));
    }
    
    toast.success('Email di reset password inviata. Controlla la tua casella di posta.');
    return { success: true };
  } catch (error) {
    logger.error("Error in password reset", { email }, error as Error); // TODO: Improve error type handling
    throw error;
  }
};
