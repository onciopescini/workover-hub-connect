import { supabase } from "@/integrations/supabase/client";
import { WaitlistInsert, WaitlistWithDetails } from "@/types/waitlist";
import { toast } from "sonner";

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
    console.error("Error joining waitlist:", error);
    toast.error("Errore nell'unirsi alla lista d'attesa");
    return false;
  }
};

// Join event waitlist
export const joinEventWaitlist = async (eventId: string): Promise<boolean> => {
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
      .eq('event_id', eventId)
      .single();

    if (existing) {
      toast.info("Sei già nella lista d'attesa per questo evento");
      return false;
    }

    const { error } = await supabase
      .from('waitlists')
      .insert({
        user_id: user.user.id,
        event_id: eventId
      });

    if (error) throw error;
    
    toast.success("Aggiunto alla lista d'attesa!");
    return true;
  } catch (error) {
    console.error("Error joining event waitlist:", error);
    toast.error("Errore nell'unirsi alla lista d'attesa dell'evento");
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
    console.error("Error leaving waitlist:", error);
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
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      created_at: item.created_at ?? '',
      space_title: item.spaces?.title ?? '',
      host_name: (item.spaces?.profiles?.first_name + ' ' + item.spaces?.profiles?.last_name) || ''
    }));
  } catch (error) {
    console.error("Error fetching waitlists:", error);
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
      event_title: '',
      event_date: '',
      host_name: ''
    }));
  } catch (error) {
    console.error("Error fetching space waitlist:", error);
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
    console.error("Error checking space waitlist:", error);
    return null;
  }
};

// Check if user is in event waitlist
export const isInEventWaitlist = async (eventId: string): Promise<string | null> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return null;

    const { data } = await supabase
      .from('waitlists')
      .select('id')
      .eq('user_id', user.user.id)
      .eq('event_id', eventId)
      .single();

    return data?.id || null;
  } catch (error) {
    console.error("Error checking event waitlist:", error);
    return null;
  }
};

// Get waitlist for event (admin/host view)
export const getEventWaitlist = async (eventId: string): Promise<WaitlistWithDetails[]> => {
  try {
    const { data, error } = await supabase
      .from('waitlists')
      .select(`
        *,
        profiles:user_id(first_name, last_name, profile_photo_url)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      created_at: item.created_at ?? '',
      space_title: '',
      event_title: '',
      event_date: '',
      host_name: ''
    }));
  } catch (error) {
    console.error("Error fetching event waitlist:", error);
    return [];
  }
};