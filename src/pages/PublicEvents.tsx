
import React, { useState } from 'react';
import { EventFilters } from '@/components/events/EventFilters';
import { EventMap } from '@/components/events/EventMap';
import { EventsGrid } from '@/components/events/EventsGrid';
import { EventsViewToggle } from '@/components/events/EventsViewToggle';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { usePublicEvents, SimpleEvent } from '@/hooks/usePublicEvents';
import { useEventFilters } from '@/hooks/useEventFilters';

const PublicEvents = () => {
  const [showMap, setShowMap] = useState(false);
  
  const {
    cityFilter,
    categoryFilter,
    dateFromFilter,
    dateToFilter,
    currentFilters,
    handleFiltersChange
  } = useEventFilters();

  const queryResult = usePublicEvents({
    cityFilter,
    categoryFilter,
    dateFromFilter,
    dateToFilter
  }) as { data: SimpleEvent[] | undefined; isLoading: boolean; error: any };

  const { data: events, isLoading, error } = queryResult;

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
            <EventFilters filters={currentFilters} onFiltersChange={handleFiltersChange} />
          </div>

          <div className="lg:w-3/4">
            <EventsViewToggle
              showMap={showMap}
              onToggleView={setShowMap}
              eventsCount={events?.length}
            />

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
              <EventsGrid 
                events={events || []} 
                onEventClick={handleEventClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicEvents;
