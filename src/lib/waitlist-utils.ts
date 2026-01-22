import { supabase } from "@/integrations/supabase/client";
import { WaitlistInsert, WaitlistWithDetails } from "@/types/waitlist";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';
import type { WaitlistSpaceJoin } from "@/types/supabase-joins";

// Join space waitlist
export const joinSpaceWaitlist = async (spaceId: string): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Devi essere autenticato per unirti alla lista d'attesa");
      return false;
    }

    // Check if already in waitlist
    const { data: existing } = await supabase
      .from('waitlists')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('space_id', spaceId)
      .single();

    if (existing) {
      toast.info("Sei già nella lista d'attesa per questo spazio");
      return false;
    }

    const { error } = await supabase
      .from('waitlists')
      .insert({
        user_id: user.user.id,
        space_id: spaceId
      });

    if (error) throw error;
    
    toast.success("Aggiunto alla lista d'attesa!");
    return true;
  } catch (error) {
    sreLogger.error("Error joining waitlist", { action: 'waitlist_join_error', spaceId }, error as Error);
    toast.error("Errore nell'unirsi alla lista d'attesa");
    return false;
  }
};

// Leave waitlist
export const leaveWaitlist = async (waitlistId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('waitlists')
      .delete()
      .eq('id', waitlistId);

    if (error) throw error;
    
    toast.success("Rimosso dalla lista d'attesa");
    return true;
  } catch (error) {
    sreLogger.error("Error leaving waitlist", { action: 'waitlist_leave_error', waitlistId }, error as Error);
    toast.error("Errore nella rimozione dalla lista d'attesa");
    return false;
  }
};

// Get user waitlists
export const getUserWaitlists = async (): Promise<WaitlistWithDetails[]> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return [];

    const { data, error } = await supabase
      .from('waitlists')
      .select(`
        *,
        spaces:space_id(title, host_id, profiles:host_id(first_name, last_name))
      `)
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })
      .overrideTypes<WaitlistSpaceJoin[]>();

    if (error) throw error;
    
    return (data || []).map(item => {
      const hostProfile = item.spaces?.profiles;
      const hostName = [hostProfile?.first_name, hostProfile?.last_name].filter(Boolean).join(' ');

      return {
        ...item,
      created_at: item.created_at ?? '',
      space_title: item.spaces?.title ?? '',
      host_name: hostName
      };
    });
  } catch (error) {
    sreLogger.error("Error fetching waitlists", { action: 'waitlist_fetch_error' }, error as Error);
    return [];
  }
};

// Get waitlist for space (admin/host view)
export const getSpaceWaitlist = async (spaceId: string): Promise<WaitlistWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('waitlists')
      .select(`
        *,
        profiles:user_id(first_name, last_name, profile_photo_url)
      `)
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      created_at: item.created_at ?? '',
      space_title: '',
      host_name: ''
    }));
  } catch (error) {
    sreLogger.error("Error fetching space waitlist", { action: 'space_waitlist_fetch_error', spaceId }, error as Error);
    return [];
  }
};

// Check if user is in space waitlist
export const isInSpaceWaitlist = async (spaceId: string): Promise<string | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return null;

    const { data } = await supabase
      .from('waitlists')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('space_id', spaceId)
      .single();

    return data?.id || null;
  } catch (error) {
    sreLogger.error("Error checking space waitlist", { action: 'space_waitlist_check_error', spaceId }, error as Error);
    return null;
  }
};
