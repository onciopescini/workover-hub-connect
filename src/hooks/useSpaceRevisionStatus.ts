
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SpaceRevisionInfo {
  id: string;
  title: string;
  is_suspended: boolean;
  revision_requested: boolean;
  revision_notes?: string;
  host_id: string;
}

export function useSpaceRevisionStatus(spaceId: string | null) {
  const [spaceInfo, setSpaceInfo] = useState<SpaceRevisionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!spaceId) {
      setSpaceInfo(null);
      return;
    }

    const fetchSpaceRevisionInfo = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('spaces')
          .select('id, title, is_suspended, revision_requested, revision_notes, host_id')
          .eq('id', spaceId)
          .single();

        if (error) throw error;
        setSpaceInfo(data);
      } catch (error) {
        console.error('Error fetching space revision info:', error);
        setSpaceInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpaceRevisionInfo();
  }, [spaceId]);

  return { spaceInfo, isLoading };
}
