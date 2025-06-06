import { supabase } from "@/integrations/supabase/client";
import { EventWithDetails, EventParticipant, WaitlistEntry } from "@/types/event";

export interface CreateEventData {
  title: string;
  description: string | null;
  space_id: string;
  date: string;
  max_participants: number;
  image_url: string | null;
  city: string | null;
  created_by: string;
}

export const getHostEvents = async (hostId: string): Promise<EventWithDetails[]> => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      space:spaces!inner(id, title, address, latitude, longitude, host_id),
      creator:profiles!fk_events_created_by(id, first_name, last_name, profile_photo_url),
      participants:event_participants(user_id),
      waitlist:waitlists(user_id)
    `)
    .eq('spaces.host_id', hostId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching host events:', error);
    throw error;
  }

  // Transform the data to match EventWithDetails type
  const transformedData: EventWithDetails[] = (data || []).map(event => ({
    ...event,
    participants: (event.participants || []).map((p: { user_id: string }): EventParticipant => ({
      event_id: event.id,
      user_id: p.user_id,
      joined_at: null, // Set to null when not available from the query
    })),
    waitlist: (event.waitlist || []).map((w: { user_id: string }): WaitlistEntry => ({
      id: '', // Set to empty string when not available from the query
      event_id: event.id,
      user_id: w.user_id,
      created_at: null, // Set to null when not available from the query
    })),
  }));

  return transformedData;
};

export const createEvent = async (eventData: CreateEventData) => {
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    throw error;
  }

  return data;
};

export const updateEvent = async (eventId: string, eventData: Partial<CreateEventData>) => {
  const { data, error } = await supabase
    .from('events')
    .update(eventData)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    console.error('Error updating event:', error);
    throw error;
  }

  return data;
};

export const deleteEvent = async (eventId: string) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

export const getEventParticipants = async (eventId: string) => {
  const { data, error } = await supabase
    .from('event_participants')
    .select(`
      *,
      user:profiles!fk_event_participants_user_id(id, first_name, last_name, profile_photo_url)
    `)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching event participants:', error);
    throw error;
  }

  return data || [];
};

export const getEventWaitlist = async (eventId: string) => {
  const { data, error } = await supabase
    .from('waitlists')
    .select(`
      *,
      user:profiles!fk_waitlists_user_id(id, first_name, last_name, profile_photo_url)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching event waitlist:', error);
    throw error;
  }

  return data || [];
};
