import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Connection, ConnectionSuggestion } from "@/types/networking";
import { User } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/auth/useAuth";

interface UseNetworkingProps {
  initialSuggestions?: ConnectionSuggestion[];
  initialConnections?: Connection[];
}

export const useNetworking = ({ initialSuggestions = [], initialConnections = [] }: UseNetworkingProps = {}) => {
  const { authState } = useAuth();
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>(initialSuggestions);
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
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
        console.log("Current user has networking disabled");
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('connection_suggestions')
        .select(`
          *,
          suggested_user:profiles!connection_suggestions_suggested_user_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio,
            networking_enabled
          )
        `)
        .eq('user_id', authState.user?.id ?? '')
        .order('score', { ascending: false });

      if (error) {
        console.error("Error fetching connection suggestions:", error);
        setError(error.message);
        toast.error("Failed to load connection suggestions.");
      } else {
        // Filtra solo utenti con networking_enabled = true (doppio controllo)
        const filteredData = (data || []).filter(item => 
          item.suggested_user?.networking_enabled === true
        );
        
        const typedSuggestions: ConnectionSuggestion[] = filteredData.map(item => ({
          ...item,
          reason: item.reason as "shared_space" | "shared_event" | "similar_interests",
          shared_context: (item.shared_context as Record<string, any>) || {},
          score: item.score ?? 0,
          created_at: item.created_at ?? ''
        }));
        setSuggestions(typedSuggestions);
      }
    } catch (err: unknown) {
      console.error("Unexpected error fetching connection suggestions:", err);
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
          sender:profiles!connections_sender_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio
          ),
          receiver:profiles!connections_receiver_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            bio
          )
        `)
        .or(`sender_id.eq.${authState.user?.id},receiver_id.eq.${authState.user?.id}`);

      if (error) {
        console.error("Error fetching connections:", error);
        setError(error.message);
        toast.error("Failed to load connections.");
      } else {
        const typedConnections: Connection[] = (data || []).map(item => ({
          ...item,
          status: item.status as "pending" | "rejected" | "accepted",
          created_at: item.created_at ?? '',
          updated_at: item.updated_at ?? '',
          expires_at: item.expires_at ?? ''
        }));
        setConnections(typedConnections);
      }
    } catch (err: unknown) {
      console.error("Unexpected error fetching connections:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      toast.error("An unexpected error occurred while loading connections.");
    } finally {
      setIsLoading(false);
    }
  }, [authState.user?.id]);

  const refreshSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: refreshError } = await supabase.functions.invoke('refresh-connection-suggestions');

      if (refreshError) {
        console.error("Error refreshing connection suggestions:", refreshError);
        setError(refreshError.message);
        toast.error("Failed to refresh connection suggestions.");
      } else {
        toast.success("Connection suggestions refreshed successfully!");
        await fetchSuggestions();
      }
    } catch (err: unknown) {
      console.error("Unexpected error refreshing connection suggestions:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      toast.error("An unexpected error occurred while refreshing suggestions.");
    } finally {
      setIsLoading(false);
    }
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
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 3 days
          },
        ]);

      if (error) {
        console.error("Error sending connection request:", error);
        toast.error("Failed to send connection request.");
        return false;
      } else {
        toast.success("Connection request sent successfully!");
        await fetchConnections();
        return true;
      }
    } catch (err: unknown) {
      console.error("Unexpected error sending connection request:", err);
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
        console.error("Error accepting connection request:", error);
        toast.error("Failed to accept connection request.");
        return false;
      } else {
        toast.success("Connection request accepted successfully!");
        await fetchConnections();
        return true;
      }
    } catch (err: unknown) {
      console.error("Unexpected error accepting connection request:", err);
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
        console.error("Error rejecting connection request:", error);
        toast.error("Failed to reject connection request.");
        return false;
      } else {
        toast.success("Connection request rejected successfully!");
        await fetchConnections();
        return true;
      }
    } catch (err: unknown) {
      console.error("Unexpected error rejecting connection request:", err);
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
        console.error("Error removing connection:", error);
        toast.error("Failed to remove connection.");
        return false;
      } else {
        toast.success("Connection removed successfully!");
        await fetchConnections();
        return true;
      }
    } catch (err: unknown) {
      console.error("Unexpected error removing connection:", err);
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
  };
};
