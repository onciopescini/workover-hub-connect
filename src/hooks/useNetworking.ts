
import { useState, useEffect, useCallback, useMemo } from "react";
import { Connection, ConnectionSuggestion } from "@/types/networking";
import { getUserConnections, getConnectionSuggestions, generateSuggestions } from "@/lib/networking-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useNetworking = () => {
  const { authState } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Memoize user ID to prevent unnecessary re-renders
  const userId = useMemo(() => authState.user?.id, [authState.user?.id]);

  // Stable fetch functions with debouncing
  const fetchConnections = useCallback(async () => {
    if (!userId) return;
    
    const now = Date.now();
    // Debounce: don't fetch if last fetch was less than 5 seconds ago
    if (now - lastFetchTime < 5000) return;
    
    setLastFetchTime(now);
    const data = await getUserConnections();
    setConnections(data);
  }, [userId, lastFetchTime]);

  const fetchSuggestions = useCallback(async () => {
    if (!userId) return;
    const data = await getConnectionSuggestions();
    setSuggestions(data);
  }, [userId]);

  const refreshSuggestions = useCallback(async () => {
    if (!userId) return;
    await generateSuggestions();
    await fetchSuggestions();
  }, [userId, fetchSuggestions]);

  // Initial data load with proper cleanup
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!userId) {
        setConnections([]);
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        await Promise.all([fetchConnections(), fetchSuggestions()]);
      } catch (error) {
        console.error('Error loading networking data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [userId]); // Only depend on userId, not the fetch functions

  // Real-time updates with proper cleanup
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('networking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`
        },
        () => {
          // Only refetch connections, not suggestions
          fetchConnections();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_suggestions',
          filter: `user_id.eq.${userId}`
        },
        () => {
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchConnections, fetchSuggestions]);

  // Memoized filter functions to prevent re-creation
  const getConnectionsByStatus = useCallback((status: 'pending' | 'accepted' | 'rejected') => {
    return connections.filter(conn => conn.status === status);
  }, [connections]);

  const getSentRequests = useCallback(() => {
    return connections.filter(conn => 
      conn.status === 'pending' && conn.sender_id === userId
    );
  }, [connections, userId]);

  const getReceivedRequests = useCallback(() => {
    return connections.filter(conn => 
      conn.status === 'pending' && conn.receiver_id === userId
    );
  }, [connections, userId]);

  const getActiveConnections = useCallback(() => {
    return connections.filter(conn => conn.status === 'accepted');
  }, [connections]);

  const areUsersConnected = useCallback((targetUserId: string): boolean => {
    return connections.some(conn => 
      conn.status === 'accepted' && 
      ((conn.sender_id === userId && conn.receiver_id === targetUserId) ||
       (conn.receiver_id === userId && conn.sender_id === targetUserId))
    );
  }, [connections, userId]);

  const hasConnectionRequest = useCallback((targetUserId: string): boolean => {
    return connections.some(conn => 
      (conn.sender_id === userId && conn.receiver_id === targetUserId) ||
      (conn.receiver_id === userId && conn.sender_id === targetUserId)
    );
  }, [connections, userId]);

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
