import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, Star, Building } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useHostSpacesQuery, useHostBookingsQuery, useHostMessagesQuery, useHostReviewsQuery } from "@/hooks/queries/useHostDashboardQuery";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const HostDashboard = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();

  // Fetch data using custom hooks
  const { data: spacesCount, isLoading: isLoadingSpaces } = useHostSpacesQuery();
  const { data: bookings, isLoading: isLoadingBookings } = useHostBookingsQuery();
  const { data: messages, isLoading: isLoadingMessages } = useHostMessagesQuery(bookings || []);
  const { data: reviewsData, isLoading: isLoadingReviews } = useHostReviewsQuery();

  // Derived data
  const upcomingBookings = bookings?.filter(booking => {
    const bookingDate = new Date(booking.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare only dates
    return bookingDate >= today;
  }) || [];

  const recentMessages = messages?.slice(0, 5) || [];
  const averageRating = reviewsData?.averageRating || 0;

  // Handlers
  const handleViewSpace = () => {
    navigate('/spaces/manage');
  };

  const handleViewBookings = () => {
    navigate('/bookings');
  };

  const handleViewMessages = () => {
    navigate('/messages');
  };

  const handleViewReviews = () => {
    navigate('/reviews');
  };

  if (!authState.profile || authState.profile.role !== 'host') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accesso Negato</h2>
          <p className="text-gray-600">Non hai i permessi per visualizzare questa pagina.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Dashboard Host
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Spazi Pubblicati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">
              {isLoadingSpaces ? "Caricamento..." : spacesCount}
            </div>
            <Button variant="secondary" onClick={handleViewSpace} className="mt-4">
              Gestisci Spazi
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Prenotazioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {isLoadingBookings ? "Caricamento..." : bookings?.length}
            </div>
            <Button variant="secondary" onClick={handleViewBookings} className="mt-4">
              Visualizza Prenotazioni
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messaggi Non Letti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {isLoadingMessages ? "Caricamento..." : messages?.length}
            </div>
            <Button variant="secondary" onClick={handleViewMessages} className="mt-4">
              Visualizza Messaggi
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Valutazione Media
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {isLoadingReviews ? "Caricamento..." : averageRating?.toFixed(1)}
            </div>
            <Button variant="secondary" onClick={handleViewReviews} className="mt-4">
              Visualizza Recensioni
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Prossime Prenotazioni
          </h2>
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center p-5">
                Nessuna prenotazione imminente.
              </CardContent>
            </Card>
          ) : (
            upcomingBookings.slice(0, 3).map((booking) => (
              <Card key={booking.id} className="mb-3">
                <CardContent className="p-4">
                  <h3 className="font-semibold">{booking.space.title}</h3>
                  <p className="text-gray-600">
                    {format(new Date(booking.booking_date), 'PPP', { locale: it })}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {booking.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Ultimi Messaggi
          </h2>
          {recentMessages.length === 0 ? (
            <Card>
              <CardContent className="text-center p-5">
                Nessun nuovo messaggio.
              </CardContent>
            </Card>
          ) : (
            recentMessages.map((message) => (
              <Card key={message.id} className="mb-3">
                <CardContent className="p-4">
                  <h3 className="font-semibold">
                    Nuovo messaggio da {message.sender?.first_name}
                  </h3>
                  <p className="text-gray-600">
                    {message.content.substring(0, 50)}...
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
