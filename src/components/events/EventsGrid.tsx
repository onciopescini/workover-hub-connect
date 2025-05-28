
import React from 'react';
import { EventCard } from './EventCard';
import { SimpleEvent } from '@/hooks/usePublicEvents';

interface EventsGridProps {
  events: SimpleEvent[];
  onEventClick: (eventId: string) => void;
}

export const EventsGrid: React.FC<EventsGridProps> = ({ events, onEventClick }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard 
          key={event.id} 
          event={event} 
          onClick={() => onEventClick(event.id)}
        />
      ))}
      {events.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500">Nessun evento trovato con i filtri selezionati.</p>
        </div>
      )}
    </div>
  );
};
