
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventCard } from '@/components/events/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { EventMap } from '@/components/events/EventMap';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Map, Grid } from 'lucide-react';

const PublicEvents = () => {
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showMap, setShowMap] = useState(false);

  // Serialize filters for queryKey to avoid complex type inference
  const filtersKey = `${cityFilter}|${categoryFilter}|${dateFromFilter}|${dateToFilter}`;

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['public-events', filtersKey],
    queryFn: async () => {
      try {
        console.log('Fetching events with filters:', { cityFilter, categoryFilter, dateFromFilter, dateToFilter });
        
        let query = supabase
          .from('events')
          .select('*')
          .eq('status', 'active')
          .gte('date', new Date().toISOString());

        if (cityFilter) {
          query = query.ilike('city', `%${cityFilter}%`);
        }

        if (categoryFilter) {
          query = query.eq('category', categoryFilter);
        }

        if (dateFromFilter) {
          query = query.gte('date', dateFromFilter);
        }

        if (dateToFilter) {
          query = query.lte('date', dateToFilter);
        }

        const { data: eventsData, error: eventsError } = await query.order('date', { ascending: true });
        
        if (eventsError) {
          console.error('Error fetching events:', eventsError);
          return [];
        }

        if (!eventsData || eventsData.length === 0) {
          console.log('No events found');
          return [];
        }

        console.log('Found events:', eventsData.length);

        const enrichedEvents = [];
        
        for (const event of eventsData) {
          const enrichedEvent = {
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
                .maybeSingle();
              
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
                .maybeSingle();
              
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
      } catch (error) {
        console.error('Error in events query:', error);
        return [];
      }
    },
  });

  const handleFiltersChange = (newFilters: any) => {
    console.log('Filters changed:', newFilters);
    setCityFilter(newFilters.city || '');
    setCategoryFilter(newFilters.category || '');
    
    if (newFilters.dateRange) {
      setDateFromFilter(newFilters.dateRange.from || '');
      setDateToFilter(newFilters.dateRange.to || '');
    } else {
      setDateFromFilter('');
      setDateToFilter('');
    }
  };

  const handleEventClick = (eventId: string) => {
    console.log('Event clicked:', eventId);
    window.open(`/events/${eventId}`, '_blank');
  };

  // Build current filters object for EventFilters component
  const currentFilters = {
    city: cityFilter,
    category: categoryFilter,
    dateRange: dateFromFilter ? { from: dateFromFilter, to: dateToFilter || undefined } : null,
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
            <EventFilters filters={currentFilters} onFiltersChange={handleFiltersChange} />
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
                {events?.map((event: any) => (
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
