
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

export interface SearchFilters {
  location: string;
  profession: string;
  industry: string;
  experience: string;
  rating: number;
  availability: string;
  connectionType: string;
}

export interface SearchedUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
  bio: string | null;
  job_title: string | null;
  skills: string | null;
  city: string | null;
  collaboration_availability: string | null;
}

export const useNetworkingSearch = () => {
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchUsers = useCallback(async (query: string, filters: SearchFilters) => {
    setIsSearching(true);
    try {
      let supabaseQuery = supabase
        .from('profiles_public_safe')
        .select(`
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio,
            job_title,
            skills,
            city,
            collaboration_availability
        `)
        .eq('networking_enabled', true);

      // Text Search (Name, Bio, Job Title, Skills)
      if (query) {
        supabaseQuery = supabaseQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,bio.ilike.%${query}%,job_title.ilike.%${query}%,skills.ilike.%${query}%`);
      }

      // Apply Structured Filters
      if (filters.location) {
        supabaseQuery = supabaseQuery.ilike('city', `%${filters.location}%`);
      }

      if (filters.profession) {
        supabaseQuery = supabaseQuery.ilike('job_title', `%${filters.profession}%`);
      }

      if (filters.industry) {
         supabaseQuery = supabaseQuery.contains('industries', [filters.industry]);
      }

      if (filters.availability) {
          if (filters.availability === 'Disponibile ora') {
             supabaseQuery = supabaseQuery.eq('collaboration_availability', 'available');
          }
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        sreLogger.error('Error searching users', { query, filters }, error);
        toast.error("Errore durante la ricerca.");
      } else {
        setSearchResults(data as SearchedUser[] || []);
      }

    } catch (err) {
      sreLogger.error('Unexpected error searching users', {}, err as Error);
      toast.error("Errore imprevisto.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  return {
    searchResults,
    isSearching,
    searchUsers
  };
};
