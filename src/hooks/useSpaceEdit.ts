import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Space } from "@/types/space";
import { sreLogger } from '@/lib/sre-logger';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Database } from '@/integrations/supabase/types';
import { mapSpaceRowToSpace } from '@/lib/space-mappers';

type SpaceRow = Database['public']['Tables']['spaces']['Row'];

export const useSpaceEdit = (id: string | undefined) => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [space, setSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSpace = async () => {
      // Wait for auth to be ready
      if (authState.isLoading) return;

      if (!id) {
        sreLogger.error("Space ID is missing", {});
        navigate('/host/spaces');
        return;
      }

      // Ensure user is authenticated
      if (!authState.isAuthenticated || !authState.user?.id) {
        // Let the page component handle auth redirect if needed,
        // but stop fetching here.
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch from the spaces table
        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', id)
          .eq('host_id', authState.user.id) // Security check
          .single();

        if (error) {
          sreLogger.error("Error fetching space", { spaceId: id }, error as Error);
          toast.error("Failed to load space details.");
          return;
        }

        const spaceRow = data as SpaceRow | null;

        if (spaceRow) {
          const mappedSpace: Space = mapSpaceRowToSpace(spaceRow);
          setSpace(mappedSpace);
        } else {
           toast.error("Space not found or permission denied");
           navigate('/host/spaces');
        }
      } catch (e) {
         sreLogger.error("Exception fetching space", { spaceId: id }, e as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpace();
  }, [id, authState.isLoading, authState.isAuthenticated, authState.user?.id, navigate]);

  const handleDeleteSpace = async () => {
    if (!id) {
      sreLogger.error("Space ID is missing for delete", {});
      return;
    }

    try {
      setIsLoading(true);

      // Delete from spaces table
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id);

      if (error) {
        sreLogger.error("Error deleting space", { spaceId: id }, error as Error);
        toast.error("Failed to delete space.");
        return;
      }

      toast.success("Space deleted successfully!");
      navigate('/host/spaces');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    space,
    isLoading,
    handleDeleteSpace
  };
};
