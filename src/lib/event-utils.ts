
import { supabase } from "@/integrations/supabase/client";
import { Event, EventWithDetails, EventParticipant, WaitlistEntry } from "@/types/event";

export const getEvent = async (eventId: string): Promise<EventWithDetails | null> => {
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      space:spaces(id, title, address),
      creator:profiles!fk_events_created_by(id, first_name, last_name, profile_photo_url)
    `)
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    return null;
  }

  // Fetch participants con la sintassi corretta per le foreign key
  const { data: participants } = await supabase
    .from('event_participants')
    .select(`
      *,
      user:profiles!fk_event_participants_user_id(id, first_name, last_name, profile_photo_url)
    `)
    .eq('event_id', eventId);

  // Fetch waitlist con la sintassi corretta per le foreign key
  const { data: waitlist } = await supabase
    .from('waitlists')
    .select(`
      *,
      user:profiles!fk_waitlists_user_id(id, first_name, last_name, profile_photo_url)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  return {
    ...event,
    participants: participants || [],
    waitlist: waitlist || []
  };
};

export const joinEvent = async (eventId: string, userId: string) => {
  const { data, error } = await supabase
    .from('event_participants')
    .insert([{ event_id: eventId, user_id: userId }])
    .select();

  if (error) {
    console.error('Error joining event:', error);
    throw error;
  }

  return data;
};

export const leaveEvent = async (eventId: string, userId: string) => {
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving event:', error);
    throw error;
  }
};

export const joinWaitlist = async (eventId: string, userId: string) => {
  const { data, error } = await supabase
    .from('waitlists')
    .insert([{ event_id: eventId, user_id: userId }])
    .select();

  if (error) {
    console.error('Error joining waitlist:', error);
    throw error;
  }

  return data;
};

export const leaveWaitlist = async (eventId: string, userId: string) => {
  const { error } = await supabase
    .from('waitlists')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving waitlist:', error);
    throw error;
  }
};

export const getUserEventStatus = (
  event: EventWithDetails,
  userId: string
): 'not_joined' | 'participant' | 'waitlist' => {
  const isParticipant = event.participants?.some(p => p.user_id === userId);
  const isInWaitlist = event.waitlist?.some(w => w.user_id === userId);

  if (isParticipant) return 'participant';
  if (isInWaitlist) return 'waitlist';
  return 'not_joined';
};

export const canJoinEvent = (event: EventWithDetails): boolean => {
  const maxParticipants = event.max_participants || 0;
  const currentParticipants = event.current_participants || 0;
  return currentParticipants < maxParticipants;
};
