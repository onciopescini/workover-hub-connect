
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EventCard } from '@/components/events/EventCard';
import { EventFilters } from '@/components/events/EventFilters';
import { EventMap } from '@/components/events/EventMap';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Map, Grid } from 'lucide-react';
import { MarketplaceLayout } from '@/components/layout/MarketplaceLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';

const PublicEvents = () => {
  const { authState } = useAuth();
  const [filters, setFilters] = useState({
    city: '',
    category: '',
    dateRange: null as { from: Date; to?: Date } | null,
  });
  const [showMap, setShowMap] = useState(false);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['public-events', filters],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          *,
          spaces (
            title,
            address,
            latitude,
            longitude,
            city
          ),
          profiles!events_created_by_fkey (
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq('status', 'active')
        .gte('date', new Date().toISOString());

      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }

      if (filters.dateRange?.from) {
        query = query.gte('date', filters.dateRange.from.toISOString());
      }

      if (filters.dateRange?.to) {
        query = query.lte('date', filters.dateRange.to.toISOString());
      }

      const { data, error } = await query.order('date', { ascending: true });
      
      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }
      
      return data || [];
    },
  });

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleEventClick = (eventId: string) => {
    window.open(`/event/${eventId}`, '_blank');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Errore nel caricamento</h2>
          <p className="text-gray-600">Si è verificato un errore durante il caricamento degli eventi.</p>
        </div>
      </div>
    );
  }

  const content = (
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
            <EventFilters onFiltersChange={handleFiltersChange} />
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

  // Use MarketplaceLayout for authenticated users, PublicLayout for guests
  if (authState.isAuthenticated) {
    return <MarketplaceLayout>{content}</MarketplaceLayout>;
  }

  return <PublicLayout>{content}</PublicLayout>;
};

export default PublicEvents;
