import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';

interface SearchResult {
  message_id: string;
  conversation_id: string;
  conversation_type: 'booking' | 'private';
  sender_id: string;
  content: string;
  created_at: string;
  space_title: string | null;
  other_user_name: string | null;
  relevance: number;
}

export const useServerMessageSearch = () => {
  const { authState } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!authState.user?.id || !query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_messages', {
        p_user_id: authState.user.id,
        p_search_query: query,
        p_limit: 50
      });

      if (error) throw error;

      setResults((data as SearchResult[]) || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Errore durante la ricerca');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [authState.user?.id]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    isSearching,
    search,
    clearResults
  };
};
