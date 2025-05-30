
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SpaceRevisionInfo {
  id: string;
  title: string;
  is_suspended: boolean;
  revision_requested: boolean;
  revision_notes?: string;
  host_id: string;
}

export function useSpaceRevisionStatus(spaceId: string | null, autoRefresh: boolean = false) {
  const [spaceInfo, setSpaceInfo] = useState<SpaceRevisionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSpaceRevisionInfo = useCallback(async () => {
    if (!spaceId) {
      setSpaceInfo(null);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('id, title, is_suspended, revision_requested, revision_notes, host_id')
        .eq('id', spaceId)
        .single();

      if (error) throw error;
      setSpaceInfo(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching space revision info:', error);
      setSpaceInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId]);

  // Initial fetch
  useEffect(() => {
    fetchSpaceRevisionInfo();
  }, [fetchSpaceRevisionInfo]);

  // Auto refresh every 30 seconds if enabled and space is suspended
  useEffect(() => {
    if (!autoRefresh || !spaceInfo?.is_suspended) return;

    const interval = setInterval(() => {
      fetchSpaceRevisionInfo();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, spaceInfo?.is_suspended, fetchSpaceRevisionInfo]);

  const refresh = useCallback(() => {
    fetchSpaceRevisionInfo();
  }, [fetchSpaceRevisionInfo]);

  return { 
    spaceInfo, 
    isLoading, 
    lastUpdated, 
    refresh 
  };
}
