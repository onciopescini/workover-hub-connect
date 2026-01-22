import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Space } from "@/types/space";
import { sreLogger } from '@/lib/sre-logger';
import { useAuth } from '@/hooks/auth/useAuth';

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
        // Fetch from 'workspaces' table (new schema)
        // using explicit casting to bypass type check for now
        const { data, error } = await (supabase
          .from('spaces') as any)
          .select('*')
          .eq('id', id)
          .eq('host_id', authState.user.id) // Security check
          .single();

        if (error) {
          sreLogger.error("Error fetching space", { spaceId: id }, error as Error);
          toast.error("Failed to load space details.");
          return;
        }

        if (data) {
          // Map workspace data to Space type
          // We map 'name' -> 'title', 'features' -> 'workspace_features', etc.
          // This ensures the form receives data in the shape it expects.
          const mappedSpace: any = {
            id: data.id,
            title: data.name,
            description: data.description || "",
            photos: data.photos || [],
            address: data.address,
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            price_per_day: data.price_per_day,
            price_per_hour: data.price_per_hour,
            max_capacity: data.max_capacity,
            capacity: data.max_capacity,
            category: data.category,
            workspace_features: data.features || [],
            amenities: data.amenities || [],
            seating_types: data.seating_types || [],
            work_environment: data.work_environment || "controlled",
            rules: data.rules,
            host_id: data.host_id,
            published: data.published || false,
            created_at: data.created_at,
            updated_at: data.updated_at,
            availability: data.availability,
            cancellation_policy: data.cancellation_policy,
            confirmation_type: data.confirmation_type || "instant",
            event_friendly_tags: data.event_friendly_tags || [],
            ideal_guest_tags: data.ideal_guest_tags || [],
          };

          setSpace(mappedSpace as Space);
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

      // Delete from workspaces table
      const { error } = await (supabase
        .from('spaces') as any)
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
