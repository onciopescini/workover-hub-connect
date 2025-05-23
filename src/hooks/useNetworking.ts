
import { useState, useEffect } from "react";
import { Connection, ConnectionSuggestion } from "@/types/networking";
import { getUserConnections, getConnectionSuggestions, generateSuggestions } from "@/lib/networking-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useNetworking = () => {
  const { authState } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data
  const fetchConnections = async () => {
    if (!authState.user) return;
    const data = await getUserConnections();
    setConnections(data);
  };

  const fetchSuggestions = async () => {
    if (!authState.user) return;
    const data = await getConnectionSuggestions();
    setSuggestions(data);
  };

  const refreshSuggestions = async () => {
    await generateSuggestions();
    await fetchSuggestions();
  };

  useEffect(() => {
    const loadData = async () => {
      if (!authState.user) {
        setConnections([]);
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await Promise.all([fetchConnections(), fetchSuggestions()]);
      setIsLoading(false);
    };

    loadData();
  }, [authState.user]);

  // Real-time updates
  useEffect(() => {
    if (!authState.user) return;

    const channel = supabase
      .channel('networking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `or(sender_id.eq.${authState.user.id},receiver_id.eq.${authState.user.id})`
        },
        () => {
          fetchConnections();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_suggestions',
          filter: `user_id.eq.${authState.user.id}`
        },
        () => {
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState.user]);

  // Filter connections by status and role
  const getConnectionsByStatus = (status: 'pending' | 'accepted' | 'rejected') => {
    return connections.filter(conn => conn.status === status);
  };

  const getSentRequests = () => {
    return connections.filter(conn => 
      conn.status === 'pending' && conn.sender_id === authState.user?.id
    );
  };

  const getReceivedRequests = () => {
    return connections.filter(conn => 
      conn.status === 'pending' && conn.receiver_id === authState.user?.id
    );
  };

  const getActiveConnections = () => {
    return connections.filter(conn => conn.status === 'accepted');
  };

  // Check if users are connected
  const areUsersConnected = (userId: string): boolean => {
    return connections.some(conn => 
      conn.status === 'accepted' && 
      ((conn.sender_id === authState.user?.id && conn.receiver_id === userId) ||
       (conn.receiver_id === authState.user?.id && conn.sender_id === userId))
    );
  };

  // Check if connection request exists
  const hasConnectionRequest = (userId: string): boolean => {
    return connections.some(conn => 
      (conn.sender_id === authState.user?.id && conn.receiver_id === userId) ||
      (conn.receiver_id === authState.user?.id && conn.sender_id === userId)
    );
  };

  return {
    connections,
    suggestions,
    isLoading,
    fetchConnections,
    fetchSuggestions,
    refreshSuggestions,
    getSentRequests,
    getReceivedRequests,
    getActiveConnections,
    areUsersConnected,
    hasConnectionRequest,
    getConnectionsByStatus
  };
};
