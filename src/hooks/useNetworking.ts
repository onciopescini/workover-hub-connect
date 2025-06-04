
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
  const [lastSuggestionsTime, setLastSuggestionsTime] = useState<number>(0);

  // Stabilized memoization of user ID to prevent unnecessary re-renders
  const userId = useMemo(() => authState.user?.id, [authState.user?.id]);

  // Stable fetch functions with more aggressive debouncing
  const fetchConnections = useCallback(async () => {
    if (!userId) return;
    
    const now = Date.now();
    // More aggressive debounce: don't fetch if last fetch was less than 15 seconds ago
    if (now - lastFetchTime < 15000) {
      console.log('[useNetworking] Connections fetch debounced');
      return;
    }
    
    console.log('[useNetworking] Fetching connections...');
    setLastFetchTime(now);
    
    try {
      const data = await getUserConnections();
      setConnections(data);
      console.log('[useNetworking] Connections fetched successfully:', data.length);
    } catch (error) {
      console.error('[useNetworking] Error fetching connections:', error);
    }
  }, [userId]);

  const fetchSuggestions = useCallback(async () => {
    if (!userId) return;
    
    const now = Date.now();
    // More aggressive debounce: don't fetch if last fetch was less than 60 seconds ago
    if (now - lastSuggestionsTime < 60000) {
      console.log('[useNetworking] Suggestions fetch debounced');
      return;
    }
    
    console.log('[useNetworking] Fetching suggestions...');
    setLastSuggestionsTime(now);
    
    try {
      const data = await getConnectionSuggestions();
      setSuggestions(data);
      console.log('[useNetworking] Suggestions fetched successfully:', data.length);
    } catch (error) {
      console.error('[useNetworking] Error fetching suggestions:', error);
    }
  }, [userId]);

  const refreshSuggestions = useCallback(async () => {
    if (!userId) return;
    
    console.log('[useNetworking] Refreshing suggestions...');
    try {
      await generateSuggestions();
      // Reset timer to force fresh fetch
      setLastSuggestionsTime(0);
      await fetchSuggestions();
    } catch (error) {
      console.error('[useNetworking] Error refreshing suggestions:', error);
    }
  }, [userId, fetchSuggestions]);

  // Initial data load with proper cleanup and enhanced debouncing
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!userId) {
        setConnections([]);
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      // Check if we already have recent data with more aggressive thresholds
      const now = Date.now();
      const hasRecentConnections = now - lastFetchTime < 15000;
      const hasRecentSuggestions = now - lastSuggestionsTime < 60000;
      
      if (hasRecentConnections && hasRecentSuggestions && connections.length > 0) {
        console.log('[useNetworking] Using cached data');
        setIsLoading(false);
        return;
      }

      console.log('[useNetworking] Loading networking data...');
      setIsLoading(true);
      
      try {
        const promises = [];
        
        if (!hasRecentConnections) {
          promises.push(fetchConnections());
        }
        
        if (!hasRecentSuggestions) {
          promises.push(fetchSuggestions());
        }
        
        await Promise.all(promises);
      } catch (error) {
        console.error('[useNetworking] Error loading networking data:', error);
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
  }, [userId]); // Only depend on userId to prevent infinite loops

  // Real-time updates with proper cleanup and enhanced debouncing
  useEffect(() => {
    if (!userId) return;

    console.log('[useNetworking] Setting up real-time subscriptions...');
    
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
        (payload) => {
          console.log('[useNetworking] Connections table changed:', payload);
          // Reset debounce timer to allow immediate fetch
          setLastFetchTime(0);
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
        (payload) => {
          console.log('[useNetworking] Suggestions table changed:', payload);
          // Reset debounce timer to allow immediate fetch
          setLastSuggestionsTime(0);
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      console.log('[useNetworking] Cleaning up real-time subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [userId, fetchConnections, fetchSuggestions]);

  // Stabilized memoized filter functions to prevent re-creation
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
