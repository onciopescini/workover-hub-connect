
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateLinkedInUrl, formatLinkedInUrl } from '@/utils/linkedinUtils';
import type { Profile } from '@/types/auth';

export const useOptimizedProfile = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const profileCacheRef = useRef<Profile | null>(null);
  const isFetchingRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string, forceRefresh = false): Promise<Profile | null> => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current && !forceRefresh) {
      console.log('Profile fetch already in progress, returning cached data');
      return profileCacheRef.current;
    }

    // Check cache validity (5 minutes)
    const now = Date.now();
    if (!forceRefresh && profileCacheRef.current && (now - lastFetchRef.current) < 300000) {
      console.log('Returning cached profile data');
      return profileCacheRef.current;
    }

    isFetchingRef.current = true;

    try {
      console.log('Fetching fresh profile for user:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return profileCacheRef.current; // Return cached data on error
      }

      // Update cache
      profileCacheRef.current = profile;
      lastFetchRef.current = now;
      console.log('Profile cached successfully');
      return profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return profileCacheRef.current; // Return cached data on error
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const updateProfile = useCallback(async (userId: string, userData: any): Promise<Profile | null> => {
    if (!userId) {
      throw new Error('Utente non autenticato');
    }

    setIsUpdating(true);
    try {
      // Validate LinkedIn URL if provided
      if (userData.linkedin_url && userData.linkedin_url.trim()) {
        const formattedUrl = formatLinkedInUrl(userData.linkedin_url);
        
        if (!validateLinkedInUrl(formattedUrl)) {
          throw new Error('URL LinkedIn non valido. Deve essere nel formato: https://linkedin.com/in/nomeutente');
        }
        
        userData.linkedin_url = formattedUrl;
      } else {
        userData.linkedin_url = null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Profile update error:', error);
        if (error.message.includes('profiles_linkedin_url_check')) {
          throw new Error('URL LinkedIn non valido. Controlla il formato dell\'URL.');
        }
        throw error;
      }

      // Update cache with new data
      profileCacheRef.current = data;
      lastFetchRef.current = Date.now();
      
      toast.success('Profilo aggiornato con successo');
      return data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Errore nell\'aggiornamento del profilo');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    profileCacheRef.current = null;
    lastFetchRef.current = 0;
    console.log('Profile cache cleared');
  }, []);

  return {
    fetchProfile,
    updateProfile,
    clearCache,
    isUpdating
  };
};
