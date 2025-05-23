
import { supabase } from "@/integrations/supabase/client";

export const cleanupAuthState = () => {
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
};

export const signOut = async () => {
  try {
    cleanupAuthState();
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
    }
    
    // Force page reload for a clean state
    window.location.href = '/login';
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
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
    
    const { count: unreadCount, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .not('sender_id', 'eq', user.user.id);
      
    if (error) throw error;
    return unreadCount || 0;
  } catch (error) {
    console.error("Error getting unread message count:", error);
    return 0;
  }
};
