
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users } from 'lucide-react';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { SimpleEvent } from '@/hooks/usePublicEvents';

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
        {/* Image with Progressive Loading */}
        <div className="relative h-32 overflow-hidden rounded-t-lg">
          <ProgressiveImage
            src={getEventImage()}
            alt={event.title}
            aspectRatio="video"
            enableWebP={true}
            enableResponsive={true}
            priority={false}
            className="w-full h-full"
            onLoadComplete={() => console.log(`Event card image loaded: ${event.title}`)}
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

          {/* Creator info with optimized avatar */}
          {event.profiles && (
            <div className="flex items-center gap-2 mb-3">
              <OptimizedImage
                src={event.profiles.profile_photo_url || '/placeholder.svg'}
                alt={`${event.profiles.first_name} ${event.profiles.last_name}`}
                enableWebP={true}
                enableResponsive={false}
                priority={false}
                className="w-6 h-6 rounded-full object-cover"
                onLoadComplete={() => console.log('Event creator avatar loaded')}
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
