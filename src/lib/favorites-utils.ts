
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Space } from "@/types/space";

export type FavoriteSpace = Space & {
  favorite_id: string;
};

// Get all favorites for current user
export const getUserFavorites = async (): Promise<FavoriteSpace[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id as favorite_id,
        space_id,
        spaces:space_id (*)
      `)
      .eq('user_id', user.user.id);

    if (error) throw error;

    // Transform response to match the FavoriteSpace type
    return data.map((item: any) => ({
      ...item.spaces,
      favorite_id: item.favorite_id
    })) as FavoriteSpace[];
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return [];
  }
};

// Add a space to favorites
export const addToFavorites = async (spaceId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("You must be logged in to add favorites");
      return false;
    }

    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.user.id,
        space_id: spaceId
      });

    if (error) {
      if (error.code === '23505') { // Unique violation
        toast.error("This space is already in your favorites");
      } else {
        toast.error("Failed to add to favorites");
        console.error(error);
      }
      return false;
    }

    toast.success("Added to favorites");
    return true;
  } catch (error) {
    console.error("Error adding to favorites:", error);
    toast.error("Failed to add to favorites");
    return false;
  }
};

// Remove from favorites
export const removeFromFavorites = async (favoriteId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);

    if (error) {
      toast.error("Failed to remove from favorites");
      console.error(error);
      return false;
    }

    toast.success("Removed from favorites");
    return true;
  } catch (error) {
    console.error("Error removing from favorites:", error);
    toast.error("Failed to remove from favorites");
    return false;
  }
};

// Check if a space is in user's favorites
export const isSpaceFavorited = async (spaceId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return false;

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('space_id', spaceId)
      .maybeSingle();

    if (error) throw error;
    
    return !!data;
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
};
