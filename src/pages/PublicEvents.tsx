
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventCard } from '@/components/events/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { EventMap } from '@/components/events/EventMap';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Map, Grid } from 'lucide-react';

// Simplified types to avoid TypeScript recursion
type BasicEvent = {
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
  spaces?: {
    title: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    city: string;
  } | null;
  profiles?: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
};

type FilterState = {
  city: string;
  category: string;
  dateRange: { from: string; to?: string } | null;
};

const PublicEvents = () => {
  const [filters, setFilters] = useState<FilterState>({
    city: '',
    category: '',
    dateRange: null,
  });
  const [showMap, setShowMap] = useState(false);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['public-events', filters],
    queryFn: async (): Promise<BasicEvent[]> => {
      try {
        console.log('Fetching events with filters:', filters);
        
        // Get basic events data
        let query = supabase
          .from('events')
          .select(`
            id,
            title,
            description,
            date,
            space_id,
            created_by,
            created_at,
            max_participants,
            current_participants,
            image_url,
            status,
            city
          `)
          .eq('status', 'active')
          .gte('date', new Date().toISOString());

        // Apply filters
        if (filters.city) {
          query = query.ilike('city', `%${filters.city}%`);
        }

        if (filters.category) {
          query = query.eq('category', filters.category);
        }

        if (filters.dateRange?.from) {
          query = query.gte('date', filters.dateRange.from);
        }

        if (filters.dateRange?.to) {
          query = query.lte('date', filters.dateRange.to);
        }

        const { data: eventsData, error: eventsError } = await query.order('date', { ascending: true });
        
        if (eventsError) {
          console.error('Error fetching events:', eventsError);
          throw eventsError;
        }

        if (!eventsData || eventsData.length === 0) {
          console.log('No events found');
          return [];
        }

        console.log('Found events:', eventsData.length);

        // Enrich events with additional data
        const enrichedEvents: BasicEvent[] = [];
        
        for (const event of eventsData) {
          const enrichedEvent: BasicEvent = { ...event };

          // Get space data
          if (event.space_id) {
            try {
              const { data: spaceData } = await supabase
                .from('spaces')
                .select('title, address, latitude, longitude, city')
                .eq('id', event.space_id)
                .maybeSingle();
              
              if (spaceData) {
                enrichedEvent.spaces = spaceData;
              }
            } catch (error) {
              console.warn('Failed to fetch space data for event', event.id, ':', error);
            }
          }

          // Get creator profile
          if (event.created_by) {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('first_name, last_name, profile_photo_url')
                .eq('id', event.created_by)
                .maybeSingle();
              
              if (profileData) {
                enrichedEvent.profiles = profileData;
              }
            } catch (error) {
              console.warn('Failed to fetch profile data for event', event.id, ':', error);
            }
          }

          enrichedEvents.push(enrichedEvent);
        }
        
        console.log('Enriched events:', enrichedEvents.length);
        return enrichedEvents;
      } catch (error) {
        console.error('Error in events query:', error);
        throw error;
      }
    },
  });

  const handleFiltersChange = (newFilters: FilterState) => {
    console.log('Filters changed:', newFilters);
    setFilters(newFilters);
  };

  const handleEventClick = (eventId: string) => {
    console.log('Event clicked:', eventId);
    window.open(`/events/${eventId}`, '_blank');
  };

  if (error) {
    console.error('Query error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Errore nel caricamento</h2>
          <p className="text-gray-600">Si è verificato un errore durante il caricamento degli eventi.</p>
          <p className="text-sm text-gray-500 mt-2">Dettagli: {String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Scopri eventi e networking
          </h1>
          <p className="text-gray-600">
            Partecipa a eventi, workshop e occasioni di networking nella tua città
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/4">
            <EventFilters filters={filters} onFiltersChange={handleFiltersChange} />
          </div>

          <div className="lg:w-3/4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Button
                  variant={!showMap ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMap(false)}
                  className="flex items-center gap-2"
                >
                  <Grid className="h-4 w-4" />
                  Griglia
                </Button>
                <Button
                  variant={showMap ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowMap(true)}
                  className="flex items-center gap-2"
                >
                  <Map className="h-4 w-4" />
                  Mappa
                </Button>
              </div>
              
              {events && (
                <p className="text-sm text-gray-600">
                  {events.length} eventi trovati
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : showMap ? (
              <div className="h-[600px]">
                <EventMap 
                  events={events || []} 
                  userLocation={{ lat: 41.9028, lng: 12.4964 }}
                  onEventClick={handleEventClick}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {events?.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onClick={() => handleEventClick(event.id)}
                  />
                ))}
                {events?.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500">Nessun evento trovato con i filtri selezionati.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicEvents;
