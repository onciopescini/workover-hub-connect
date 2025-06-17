
import React, { useState } from 'react';
import { EventFilters } from '@/components/events/EventFilters';
import { EventMap } from '@/components/events/EventMap';
import { EventCardsGrid } from '@/components/events/EventCardsGrid';
import { SplitScreenLayout } from '@/components/shared/SplitScreenLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { usePublicEvents, SimpleEvent } from '@/hooks/usePublicEvents';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useMapCardInteraction } from '@/hooks/useMapCardInteraction';

const PublicEvents = () => {
  const {
    cityFilter,
    categoryFilter,
    dateFromFilter,
    dateToFilter,
    currentFilters,
    handleFiltersChange
  } = useEventFilters();

  const {
    selectedId,
    highlightedId,
    handleCardClick,
    handleMarkerClick,
    clearSelection
  } = useMapCardInteraction();

  const queryResult = usePublicEvents({
    cityFilter,
    categoryFilter,
    dateFromFilter,
    dateToFilter
  }) as { data: SimpleEvent[] | undefined; isLoading: boolean; error: any };

  const { data: events, isLoading, error } = queryResult;

  const handleEventClick = (eventId: string) => {
    handleCardClick(eventId);
    console.log('Event clicked:', eventId);
    window.open(`/events/${eventId}`, '_blank');
  };

  const handleMapEventClick = (eventId: string) => {
    handleMarkerClick(eventId);
  };

  const handleFiltersChangeWithClear = (newFilters: any) => {
    handleFiltersChange(newFilters);
    clearSelection();
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <SplitScreenLayout
      filters={
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Scopri eventi e networking
            </h1>
            <p className="text-gray-600">
              Partecipa a eventi, workshop e occasioni di networking nella tua città
            </p>
          </div>
          <EventFilters filters={currentFilters} onFiltersChange={handleFiltersChangeWithClear} />
          {events && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                {events.length} eventi trovati
              </p>
            </div>
          )}
        </div>
      }
      map={
        <EventMap 
          events={events || []} 
          userLocation={{ lat: 41.9028, lng: 12.4964 }}
          onEventClick={handleMapEventClick}
          highlightedEventId={highlightedId}
        />
      }
      cards={
        <EventCardsGrid 
          events={events || []} 
          onEventClick={handleEventClick}
          highlightedId={highlightedId}
        />
      }
    />
  );
};

export default PublicEvents;
