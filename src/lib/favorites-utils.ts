import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';
import type { FavoriteSpaceJoin } from "@/types/supabase-joins";

export interface FavoriteSpace {
  id: string;
  user_id: string;
  space_id: string;
  created_at: string;
  space: {
    id: string;
    title: string; // Mapped from spaces.title for UI compatibility
    description: string;
    address: string;
    price_per_day: number;
    photos: string[];
    category: string;
    work_environment: string;
    host_id: string;
  } | null;
}

export const getFavoriteSpaces = async (userId: string): Promise<FavoriteSpace[]> => {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        *,
        space:spaces (
          id,
          title,
          description,
          address,
          price_per_day,
          photos,
          category,
          work_environment,
          host_id
        )
      `)
      .eq('user_id', userId)
      .overrideTypes<FavoriteSpaceJoin[]>();

    if (error) {
      sreLogger.error('Error fetching favorite spaces', { 
        context: 'getFavoriteSpaces',
        userId 
      }, error as Error);
      throw error;
    }

    return (data || []).map((item): FavoriteSpace => {
      const photos = item.space?.photos;
      const photoArray: string[] = Array.isArray(photos) 
        ? (photos as unknown[]).filter((p): p is string => typeof p === 'string')
        : [];
        
      return {
        id: item.id,
        user_id: item.user_id,
        space_id: item.space_id,
        created_at: item.created_at ?? '',
        space: item.space ? {
          id: item.space.id,
          title: item.space.title || '',
          description: item.space.description || '',
          address: item.space.address || '',
          price_per_day: item.space.price_per_day || 0,
          photos: photoArray,
          category: item.space.category || '',
          work_environment: item.space.work_environment || '',
          host_id: item.space.host_id || ''
        } : null
      };
    });
  } catch (error) {
    sreLogger.error('Error in getFavoriteSpaces', { 
      context: 'getFavoriteSpaces',
      userId 
    }, error as Error);
    return [];
  }
};

export const isSpaceFavorited = async (spaceId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      return false;
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('space_id', spaceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      sreLogger.error('Error checking favorite status', { 
        context: 'isSpaceFavorited',
        spaceId,
        userId: user.user.id 
      }, error as Error);
      return false;
    }

    return !!data;
  } catch (error) {
    sreLogger.error('Error in isSpaceFavorited', { 
      context: 'isSpaceFavorited',
      spaceId 
    }, error as Error);
    return false;
  }
};

export const addToFavorites = async (spaceId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.user.id,
        space_id: spaceId,
      });

    if (error) {
      sreLogger.error('Error adding to favorites', { 
        context: 'addToFavorites',
        spaceId,
        userId: user.user.id 
      }, error as Error);
      toast.error('Errore nell\'aggiunta ai preferiti');
      return false;
    }

    toast.success('Aggiunto ai preferiti');
    return true;
  } catch (error) {
    sreLogger.error('Error in addToFavorites', { 
      context: 'addToFavorites',
      spaceId 
    }, error as Error);
    toast.error('Errore nell\'aggiunta ai preferiti');
    return false;
  }
};

export const removeFromFavorites = async (spaceId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.user.id)
      .eq('space_id', spaceId);

    if (error) {
      sreLogger.error('Error removing from favorites', { 
        context: 'removeFromFavorites',
        spaceId,
        userId: user.user.id 
      }, error as Error);
      toast.error('Errore nella rimozione dai preferiti');
      return false;
    }

    toast.success('Rimosso dai preferiti');
    return true;
  } catch (error) {
    sreLogger.error('Error in removeFromFavorites', { 
      context: 'removeFromFavorites',
      spaceId 
    }, error as Error);
    toast.error('Errore nella rimozione dai preferiti');
    return false;
  }
};
