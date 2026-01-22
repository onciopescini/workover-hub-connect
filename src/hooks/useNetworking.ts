import { useState, useEffect, useCallback } from "react";
import { TIME_CONSTANTS } from "@/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Connection, ConnectionSuggestion, Coworker } from "@/types/networking";
import { useAuth } from "@/hooks/auth/useAuth";
import { sreLogger } from '@/lib/sre-logger';
import { mapConnectionSuggestion } from "@/lib/networking-mappers";

interface UseNetworkingProps {
  initialSuggestions?: ConnectionSuggestion[];
  initialConnections?: Connection[];
}

export interface SearchFilters {
  location?: string;
  profession?: string;
  industry?: string;
  skills?: string;
}

export const useNetworking = ({ initialSuggestions = [], initialConnections = [] }: UseNetworkingProps = {}) => {
  const { authState } = useAuth();
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>(initialSuggestions);
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [searchResults, setSearchResults] = useState<Coworker[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Verifica che l'utente corrente abbia networking_enabled
      const { data: currentUser } = await supabase
        .from('profiles')
        .select('networking_enabled')
        .eq('id', authState.user?.id ?? '')
        .single();

      if (!currentUser?.networking_enabled) {
        sreLogger.debug('Current user has networking disabled');
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      // Call the new RPC function
      const { data, error } = await supabase.rpc('get_networking_suggestions', {
        current_user_id: authState.user?.id ?? ''
      });

      if (error) {
        sreLogger.error('Error fetching connection suggestions', {}, error);
        setError(error.message);
        toast.error("Failed to load connection suggestions.");
      } else {
        const mappedSuggestions = (data || [])
          .map((item) => mapConnectionSuggestion(item))
          .filter((item): item is ConnectionSuggestion => item !== null);
        setSuggestions(mappedSuggestions);
      }
    } catch (err: unknown) {
      sreLogger.error('Unexpected error fetching connection suggestions', {}, err as Error);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      toast.error("An unexpected error occurred while loading suggestions.");
    } finally {
      setIsLoading(false);
    }
  }, [authState.user?.id]);

  const fetchConnections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          sender:profiles!connections_sender_id_fkey!inner (
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio
          ),
          receiver:profiles!connections_receiver_id_fkey!inner (
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio
          )
        `)
        .or(`sender_id.eq.${authState.user?.id},receiver_id.eq.${authState.user?.id}`);

      if (error) {
        sreLogger.error('Error fetching connections', {}, error);
        setError(error.message);
        toast.error("Failed to load connections.");
      } else {
        // Strict client-side filter to ensure both parties are visible (handles RLS edge cases)
        const validConnections = (data || []).filter(item => item.sender && item.receiver);

        const typedConnections: Connection[] = validConnections.map(item => ({
          ...item,
          status: item.status as "pending" | "rejected" | "accepted",
          created_at: item.created_at ?? '',
          updated_at: item.updated_at ?? '',
          expires_at: item.expires_at ?? ''
        }));
        setConnections(typedConnections);
      }
    } catch (err: unknown) {
      sreLogger.error('Unexpected error fetching connections', {}, err as Error);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      toast.error("An unexpected error occurred while loading connections.");
    } finally {
      setIsLoading(false);
    }
  }, [authState.user?.id]);

  const refreshSuggestions = useCallback(async () => {
    // For the new RPC approach, refresh effectively just means re-fetching
    // The previous refresh relied on an edge function to recalculate.
    // If that edge function still exists and populates a table the RPC reads from, keep it.
    // If the RPC calculates on the fly, we just call fetchSuggestions.
    // Assuming RPC calculates on the fly given the name and params.
    // However, the user said "Connect Networking to New DB Function".
    // I will just re-fetch suggestions.
    await fetchSuggestions();
    toast.success("Connection suggestions refreshed!");
  }, [fetchSuggestions]);

  const sendConnectionRequest = async (receiverId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .insert([
          {
            sender_id: authState.user?.id ?? '',
            receiver_id: receiverId,
            status: 'pending',
            expires_at: new Date(Date.now() + TIME_CONSTANTS.CONNECTION_REQUEST_EXPIRY).toISOString(), // Expires in 3 days
          },
        ]);

      if (error) {
        sreLogger.error('Error sending connection request', { receiverId }, error);
        toast.error("Failed to send connection request.");
        return false;
      } else {
        toast.success("Connection request sent successfully!");
        await fetchConnections();
        return true;
      }
    } catch (err: unknown) {
      sreLogger.error('Unexpected error sending connection request', {}, err as Error);
      toast.error("An unexpected error occurred while sending the connection request.");
      return false;
    }
  };

  const acceptConnectionRequest = async (connectionId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) {
        sreLogger.error('Error accepting connection request', { connectionId }, error);
        toast.error("Failed to accept connection request.");
        return false;
      } else {
        toast.success("Connection request accepted successfully!");
        await fetchConnections();
        return true;
      }
    } catch (err: unknown) {
      sreLogger.error('Unexpected error accepting connection request', {}, err as Error);
      toast.error("An unexpected error occurred while accepting the connection request.");
      return false;
    }
  };

  const rejectConnectionRequest = async (connectionId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        sreLogger.error('Error rejecting connection request', { connectionId }, error);
        toast.error("Failed to reject connection request.");
        return false;
      } else {
        toast.success("Connection request rejected successfully!");
        await fetchConnections();
        return true;
      }
    } catch (err: unknown) {
      sreLogger.error('Unexpected error rejecting connection request', {}, err as Error);
      toast.error("An unexpected error occurred while rejecting the connection request.");
      return false;
    }
  };

  const removeConnection = async (connectionId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        sreLogger.error('Error removing connection', { connectionId }, error);
        toast.error("Failed to remove connection.");
        return false;
      } else {
        toast.success("Connection removed successfully!");
        await fetchConnections();
        return true;
      }
    } catch (err: unknown) {
      sreLogger.error('Unexpected error removing connection', {}, err as Error);
      toast.error("An unexpected error occurred while removing the connection.");
      return false;
    }
  };

  const hasConnectionRequest = (userId: string): boolean => {
    return connections.some(
      (connection) =>
        (connection.sender_id === authState.user?.id && connection.receiver_id === userId) ||
        (connection.receiver_id === authState.user?.id && connection.sender_id === userId)
    );
  };

  const getSentRequests = (): Connection[] => {
    return connections.filter(
      (connection) => connection.sender_id === authState.user?.id && connection.status === 'pending'
    );
  };

  const getReceivedRequests = (): Connection[] => {
    return connections.filter(
      (connection) => connection.receiver_id === authState.user?.id && connection.status === 'pending'
    );
  };

  const getActiveConnections = (): Connection[] => {
    return connections.filter((connection) => connection.status === 'accepted');
  };

  const searchCoworkers = async (query: string, filters: SearchFilters) => {
    setIsSearching(true);
    setIsLoading(true);
    setError(null);

    try {
      let dbQuery = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          profession,
          profile_photo_url,
          linkedin_url,
          cached_avg_rating,
          cached_review_count,
          bio,
          skills,
          industry,
          location
        `)
        .eq('networking_enabled', true)
        .neq('id', authState.user?.id || '');

      if (query) {
        dbQuery = dbQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,bio.ilike.%${query}%`);
      }

      if (filters.industry) {
        dbQuery = dbQuery.ilike('industry', `%${filters.industry}%`);
      }

      if (filters.skills) {
        // User confirmed skills is text match
        dbQuery = dbQuery.ilike('skills', `%${filters.skills}%`);
      }

      if (filters.location) {
        dbQuery = dbQuery.ilike('location', `%${filters.location}%`);
      }

      if (filters.profession) {
        dbQuery = dbQuery.ilike('profession', `%${filters.profession}%`);
      }

      const { data, error } = await dbQuery;

      if (error) {
        sreLogger.error('Error searching coworkers', { query, filters }, error);
        setError(error.message);
        toast.error("Failed to search coworkers.");
      } else {
        const typedResults: Coworker[] = (data || []).map(item => ({
          id: item.id,
          first_name: item.first_name || '',
          last_name: item.last_name || '',
          profession: item.profession,
          avatar_url: item.profile_photo_url,
          linkedin_url: item.linkedin_url,
          cached_avg_rating: item.cached_avg_rating || 0,
          cached_review_count: item.cached_review_count || 0,
          bio: item.bio,
          skills: item.skills,
          industry: item.industry,
          location: item.location
        }));
        setSearchResults(typedResults);
      }
    } catch (err: unknown) {
      sreLogger.error('Unexpected error searching coworkers', {}, err as Error);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      toast.error("An unexpected error occurred while searching.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchResults([]);
    setIsSearching(false);
  };

  useEffect(() => {
    if (authState.user) {
      fetchSuggestions();
      fetchConnections();
    }
  }, [authState.user, fetchSuggestions, fetchConnections]);

  return {
    suggestions,
    connections,
    isLoading,
    error,
    fetchSuggestions,
    fetchConnections,
    refreshSuggestions,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    removeConnection,
    hasConnectionRequest,
    getSentRequests,
    getReceivedRequests,
    getActiveConnections,
    searchCoworkers,
    searchResults,
    isSearching,
    clearSearch,
  };
};
