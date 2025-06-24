import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Star, MessageSquare, Users, Coffee, CheckCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Space } from "@/types/space";
import { Review } from "@/types/review";
import { calculateAverageRating } from "@/lib/review-utils";
import { SpaceReviews } from './SpaceReviews';
import { BookingForm } from './BookingForm';
import FavoriteButton from './FavoriteButton';
import { useBookings } from '@/hooks/useBookings';
import { toast } from 'sonner';

interface SpaceDetailContentProps {
  space: Space;
  reviews: Review[];
}

export function SpaceDetailContent({ space, reviews }: SpaceDetailContentProps) {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const { isLoading: isBookingLoading, createBooking } = useBookings();

  const averageRating = calculateAverageRating(reviews);

  const handleBookingSuccess = () => {
    toast.success("Prenotazione creata con successo!");
    setShowBookingForm(false);
  };

  const handleBookingError = (errorMessage: string) => {
    toast.error(errorMessage);
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="grid gap-4">
      {/* Space Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">{space.title}</CardTitle>
              <p className="text-gray-500 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {space.address}, {space.city}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <FavoriteButton spaceId={space.id} />
              
              {space.host && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={space.host.profile_photo_url || undefined} />
                  <AvatarFallback>
                    {getInitials(space.host.first_name, space.host.last_name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="py-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-700">{space.description}</p>
              
              <div className="mt-4 flex items-center space-x-3">
                <Badge variant="secondary">
                  <Calendar className="w-4 h-4 mr-1" />
                  Disponibile
                </Badge>
                <Badge variant="secondary">
                  <Coffee className="w-4 h-4 mr-1" />
                  {space.category}
                </Badge>
                {space.work_environment && (
                  <Badge variant="secondary">
                    <Users className="w-4 h-4 mr-1" />
                    {space.work_environment}
                  </Badge>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-2">Dettagli</h4>
              <ul className="list-disc list-inside text-gray-600">
                <li>Prezzo: €{space.price_per_day} al giorno</li>
                <li>Capacità massima: {space.max_capacity} persone</li>
                <li>Superficie: {space.size_sqm} mq</li>
                <li>Servizi: {space.amenities?.join(', ') || 'Nessuno'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Section */}
      <Card>
        <CardHeader>
          <CardTitle>Prenota questo spazio</CardTitle>
        </CardHeader>
        <CardContent>
          {authState.isAuthenticated ? (
            showBookingForm ? (
              <BookingForm 
                spaceId={space.id}
                pricePerDay={space.price_per_day}
                onSuccess={handleBookingSuccess}
                onError={handleBookingError}
              />
            ) : (
              <div className="text-center">
                <Button onClick={() => setShowBookingForm(true)}>
                  Prenota ora
                </Button>
              </div>
            )
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Devi effettuare l'accesso per prenotare questo spazio.
              </p>
              <Button onClick={() => navigate('/login')}>
                Accedi per prenotare
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <SpaceReviews spaceId={space.id} reviews={reviews} />
    </div>
  );
}
