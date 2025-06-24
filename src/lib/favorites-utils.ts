import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FavoriteSpace {
  id: string;
  user_id: string;
  space_id: string;
  created_at: string;
  space: {
    id: string;
    title: string;
    description: string;
    address: string;
    price_per_day: number;
    photos: string[];
    category: string;
    work_environment: string;
    host_id: string;
  };
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
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching favorite spaces:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getFavoriteSpaces:', error);
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
      console.error('Error checking favorite status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in isSpaceFavorited:', error);
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
      console.error('Error adding to favorites:', error);
      toast.error('Errore nell\'aggiunta ai preferiti');
      return false;
    }

    toast.success('Aggiunto ai preferiti');
    return true;
  } catch (error) {
    console.error('Error in addToFavorites:', error);
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
      console.error('Error removing from favorites:', error);
      toast.error('Errore nella rimozione dai preferiti');
      return false;
    }

    toast.success('Rimosso dai preferiti');
    return true;
  } catch (error) {
    console.error('Error in removeFromFavorites:', error);
    toast.error('Errore nella rimozione dai preferiti');
    return false;
  }
};
