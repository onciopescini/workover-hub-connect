
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsePublicEventsParams {
  cityFilter: string;
  categoryFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
}

interface SimpleEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  space_id: string;
  created_by: string | null;
  created_at: string | null;
  max_participants: number | null;
  current_participants: number | null;
  image_url: string | null;
  status: string | null;
  city: string | null;
  spaces: {
    title: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    city: string;
  } | null;
  profiles: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
}

// Raw Supabase query function with aggressive type elimination  
const fetchEventsRaw = async (filters: UsePublicEventsParams): Promise<Array<Record<string, unknown>>> => {
  try {
    console.log('Fetching events with filters:', filters);
    
    let query = supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .gte('date', new Date().toISOString()) as any;

    if (filters.cityFilter) {
      query = query.ilike('city', `%${filters.cityFilter}%`) as any;
    }

    if (filters.categoryFilter) {
      query = query.eq('category', filters.categoryFilter) as any;
    }

    if (filters.dateFromFilter) {
      query = query.gte('date', filters.dateFromFilter) as any;
    }

    if (filters.dateToFilter) {
      query = query.lte('date', filters.dateToFilter) as any;
    }

    const { data: eventsData, error: eventsError } = await query.order('date', { ascending: true }) as any;
    
    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return [];
    }

    if (!eventsData || eventsData.length === 0) {
      console.log('No events found');
      return [];
    }

    console.log('Found events:', eventsData.length);
    return eventsData;
  } catch (error) {
    console.error('Error in events query:', error);
    return [];
  }
};

// Data transformation function
const transformEvents = async (rawEvents: Array<Record<string, unknown>>): Promise<SimpleEvent[]> => {
  const enrichedEvents: SimpleEvent[] = [];
  
  for (const event of rawEvents) {
    const enrichedEvent: SimpleEvent = {
      ...event,
      spaces: null,
      profiles: null
    };

    if (event.space_id) {
      try {
        const { data: spaceData, error: spaceError } = await supabase
          .from('spaces')
          .select('title, address, latitude, longitude')
          .eq('id', event.space_id)
          .maybeSingle() as any;
        
        if (!spaceError && spaceData && spaceData.title) {
          enrichedEvent.spaces = {
            title: spaceData.title || '',
            address: spaceData.address || '',
            latitude: spaceData.latitude || null,
            longitude: spaceData.longitude || null,
            city: ''
          };
        }
      } catch (error) {
        console.warn('Failed to fetch space data for event', event.id, ':', error);
      }
    }

    if (event.created_by) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, profile_photo_url')
          .eq('id', event.created_by)
          .maybeSingle() as any;
        
        if (!profileError && profileData) {
          enrichedEvent.profiles = {
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            profile_photo_url: profileData.profile_photo_url || null
          };
        }
      } catch (error) {
        console.warn('Failed to fetch profile data for event', event.id, ':', error);
      }
    }

    enrichedEvents.push(enrichedEvent);
  }
  
  console.log('Enriched events:', enrichedEvents.length);
  return enrichedEvents;
};

// Main fetch function
const fetchPublicEvents = async (filters: UsePublicEventsParams): Promise<SimpleEvent[]> => {
  const rawEvents = await fetchEventsRaw(filters);
  return await transformEvents(rawEvents);
};

export const usePublicEvents = (filters: UsePublicEventsParams) => {
  const filtersKey = `${filters.cityFilter}|${filters.categoryFilter}|${filters.dateFromFilter}|${filters.dateToFilter}`;

  return useQuery({
    queryKey: ['public-events', filtersKey],
    queryFn: () => fetchPublicEvents(filters),
  });
};

export type { SimpleEvent };
