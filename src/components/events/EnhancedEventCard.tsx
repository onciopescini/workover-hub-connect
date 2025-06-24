
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Clock, 
  Heart, 
  Share2, 
  Verified, 
  TrendingUp,
  User,
  Euro
} from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface EnhancedEventCardProps {
  event: {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    location: string;
    max_participants?: number;
    current_participants?: number;
    price?: number;
    is_free: boolean;
    image_url?: string;
    organizer?: {
      name: string;
      avatar?: string;
      verified?: boolean;
    };
    tags?: string[];
    status?: 'upcoming' | 'ongoing' | 'past';
  };
  onClick: () => void;
}

export const EnhancedEventCard: React.FC<EnhancedEventCardProps> = ({ event, onClick }) => {
  const [isLiked, setIsLiked] = useState(false);

  const getStatusBadge = () => {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    if (now < startDate) {
      return { label: 'Prossimamente', color: 'bg-blue-100 text-blue-800' };
    } else if (now >= startDate && now <= endDate) {
      return { label: 'In corso', color: 'bg-green-100 text-green-800' };
    } else {
      return { label: 'Terminato', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getAvailabilityStatus = () => {
    if (!event.max_participants) return null;
    
    const available = event.max_participants - (event.current_participants || 0);
    const percentageFull = ((event.current_participants || 0) / event.max_participants) * 100;
    
    if (available === 0) {
      return { label: 'Sold Out', color: 'bg-red-100 text-red-800' };
    } else if (percentageFull >= 80) {
      return { label: 'Quasi al completo', color: 'bg-orange-100 text-orange-800' };
    } else if (percentageFull >= 50) {
      return { label: 'Posti limitati', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Posti disponibili', color: 'bg-green-100 text-green-800' };
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Implementare logica di condivisione
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const statusBadge = getStatusBadge();
  const availabilityStatus = getAvailabilityStatus();
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);

  return (
    <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group overflow-hidden">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <OptimizedImage
            src={event.image_url || '/placeholder.svg'}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onClick={onClick}
          />
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge className={statusBadge.color}>
              {statusBadge.label}
            </Badge>
          </div>

          {/* Availability Badge */}
          {availabilityStatus && (
            <div className="absolute top-3 right-12">
              <Badge className={availabilityStatus.color}>
                {availabilityStatus.label}
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className="absolute top-3 right-3 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 bg-white/80 hover:bg-white backdrop-blur-sm"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`w-8 h-8 p-0 backdrop-blur-sm ${
                isLiked 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-white/80 hover:bg-white'
              }`}
              onClick={handleLike}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {/* Price Badge */}
          <div className="absolute bottom-3 right-3">
            {event.is_free ? (
              <Badge className="bg-green-600 text-white">
                Gratuito
              </Badge>
            ) : (
              <Badge className="bg-indigo-600 text-white">
                €{event.price}
              </Badge>
            )}
          </div>

          {/* Trending indicator */}
          {event.current_participants && event.current_participants > 10 && (
            <div className="absolute bottom-3 left-3 bg-orange-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Popolare
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4" onClick={onClick}>
          {/* Title */}
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">{event.title}</h3>

          {/* Date and Time */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Calendar className="w-4 h-4" />
            <span>
              {format(startDate, 'dd MMM', { locale: it })}
              {startDate.toDateString() !== endDate.toDateString() && 
                ` - ${format(endDate, 'dd MMM', { locale: it })}`
              }
            </span>
            <Clock className="w-4 h-4 ml-2" />
            <span>
              {format(startDate, 'HH:mm', { locale: it })}
              {startDate.getTime() !== endDate.getTime() && 
                ` - ${format(endDate, 'HH:mm', { locale: it })}`
              }
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-600 mb-3">
            <MapPin className="w-4 h-4" />
            <span className="text-sm line-clamp-1">{event.location}</span>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {event.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {event.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{event.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Organizer and Participants */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {event.organizer && (
                <>
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    {event.organizer.avatar ? (
                      <OptimizedImage
                        src={event.organizer.avatar}
                        alt={event.organizer.name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <User className="w-3 h-3 text-gray-500" />
                    )}
                  </div>
                  <span className="text-xs text-gray-600">{event.organizer.name}</span>
                  {event.organizer.verified && (
                    <Verified className="w-3 h-3 text-blue-500" />
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Participants */}
              {event.max_participants && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>{event.current_participants || 0}/{event.max_participants}</span>
                </div>
              )}

              {/* Action Button */}
              <Button 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                {event.is_free ? 'Partecipa' : 'Acquista'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
