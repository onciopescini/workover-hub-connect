
import { supabase } from "@/integrations/supabase/client";

export const cleanupAuthState = () => {
  console.log('Starting auth state cleanup...');
  
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

  console.log('Auth state cleanup completed');
};

export const aggressiveSignOut = async () => {
  try {
    console.log('Starting aggressive sign out...');
    
    // Clean up auth state first
    cleanupAuthState();
    
    // Attempt multiple sign out scopes
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('Global sign out failed:', err);
    }

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('Local sign out failed:', err);
    }

    // Additional cleanup - clear any remaining session data
    try {
      // Force session termination
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Standard sign out failed:', err);
    }

    console.log('Aggressive sign out completed');
    
    // Force page reload to ensure clean state
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
    
  } catch (error) {
    console.error("Error in aggressive sign out:", error);
    // Even if logout fails, force navigation
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
    console.error("Error getting unread message count:", error);
    return 0;
  }
};

// Helper function to handle login with cleanup and force account picker
export const cleanSignInWithGoogle = async () => {
  try {
    console.log('Starting clean Google sign in...');
    
    // Clean up existing state first
    cleanupAuthState();
    
    // Attempt global sign out to clear any existing sessions
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('Pre-login cleanup sign out failed:', err);
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
    
    if (error) throw error;
    
    console.log('Google sign in initiated successfully');
    return data;
  } catch (error) {
    console.error("Error in clean Google sign in:", error);
    throw error;
  }
};

// Helper function to handle login with cleanup
export const cleanSignIn = async (email: string, password: string) => {
  try {
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
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in clean sign in:", error);
    throw error;
  }
};
