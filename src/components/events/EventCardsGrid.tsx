
import React from 'react';
import { EventCard } from './EventCard';
import { SimpleEvent } from '@/hooks/usePublicEvents';

interface EventCardsGridProps {
  events: SimpleEvent[];
  onEventClick: (eventId: string) => void;
  highlightedId: string | null;
}

export const EventCardsGrid: React.FC<EventCardsGridProps> = ({
  events,
  onEventClick,
  highlightedId
}) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {events.map((event) => (
        <div
          key={event.id}
          className={`transition-all duration-200 ${
            highlightedId === event.id 
              ? 'ring-2 ring-purple-500 ring-opacity-50 shadow-lg scale-105' 
              : ''
          }`}
        >
          <EventCard 
            event={event} 
            onClick={() => onEventClick(event.id)}
          />
        </div>
      ))}
      {events.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500">Nessun evento trovato con i filtri selezionati.</p>
        </div>
      )}
    </div>
  );
};
