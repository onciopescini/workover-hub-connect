
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateLinkedInUrl, formatLinkedInUrl } from '@/utils/linkedinUtils';
import type { Profile } from '@/types/auth';

export const useProfile = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      console.log('Profile fetched successfully:', profile);
      return profile;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const updateProfile = async (userId: string, userData: any): Promise<Profile | null> => {
    if (!userId) {
      throw new Error('Utente non autenticato');
    }

    setIsUpdating(true);
    try {
      // Validate LinkedIn URL if provided
      if (userData.linkedin_url && userData.linkedin_url.trim()) {
        const formattedUrl = formatLinkedInUrl(userData.linkedin_url);
        
        // Validate against database constraint
        if (!validateLinkedInUrl(formattedUrl)) {
          throw new Error('URL LinkedIn non valido. Deve essere nel formato: https://linkedin.com/in/nomeutente');
        }
        
        userData.linkedin_url = formattedUrl;
      } else {
        // Set to null if empty to avoid constraint violations
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

      toast.success('Profilo aggiornato con successo');
      return data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Errore nell\'aggiornamento del profilo');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    fetchProfile,
    updateProfile,
    isUpdating
  };
};
