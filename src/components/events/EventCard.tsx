
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

// Simple event type to match the one used in PublicEvents
type SimpleEvent = {
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

interface EventCardProps {
  event: SimpleEvent;
  onClick: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick }) => {
  const getEventImage = () => {
    return event.image_url || '/placeholder.svg';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isEventFull = () => {
    return event.max_participants && 
           (event.current_participants || 0) >= event.max_participants;
  };

  const getAvailabilityText = () => {
    if (!event.max_participants) return 'Posti illimitati';
    const available = event.max_participants - (event.current_participants || 0);
    return available > 0 ? `${available} posti disponibili` : 'Evento al completo';
  };

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-32 overflow-hidden rounded-t-lg">
          <img
            src={getEventImage()}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2">
            <Badge className="bg-purple-600">
              {formatDate(event.date)}
            </Badge>
          </div>
          {isEventFull() && (
            <div className="absolute top-2 right-2">
              <Badge variant="destructive">
                Al completo
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">{event.title}</h3>

          {event.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {event.description}
            </p>
          )}

          {/* Event details */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(event.date)} alle {formatTime(event.date)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">
                {event.spaces?.title || 'Spazio'} - {event.spaces?.address || 'Indirizzo'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{getAvailabilityText()}</span>
            </div>
          </div>

          {/* Creator info */}
          {event.profiles && (
            <div className="flex items-center gap-2 mb-3">
              <img
                src={event.profiles.profile_photo_url || '/placeholder.svg'}
                alt={`${event.profiles.first_name} ${event.profiles.last_name}`}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm text-gray-600">
                Organizzato da {event.profiles.first_name} {event.profiles.last_name}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {event.current_participants || 0} partecipanti
            </div>
            <Button 
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700"
              disabled={isEventFull()}
            >
              {isEventFull() ? 'Al completo' : 'Visualizza dettagli'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
