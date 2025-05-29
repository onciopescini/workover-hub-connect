
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Calendar, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BookingWithSpace {
  id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  space: {
    id: string;
    title: string;
    host_id: string;
  } | null;
}

const Messages = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['user-bookings-messages', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) return [];

      try {
        // Prima, otteniamo tutti i bookings dell'utente come coworker
        const { data: coworkerBookings, error: coworkerError } = await supabase
          .from('bookings')
          .select('id, booking_date, status, space_id')
          .eq('user_id', authState.user.id)
          .order('booking_date', { ascending: false });

        if (coworkerError) {
          console.error('Error fetching coworker bookings:', coworkerError);
          throw coworkerError;
        }

        // Poi, otteniamo gli spazi dell'utente per trovare i bookings come host
        const { data: userSpaces, error: spacesError } = await supabase
          .from('spaces')
          .select('id')
          .eq('host_id', authState.user.id);

        if (spacesError) {
          console.error('Error fetching user spaces:', spacesError);
          throw spacesError;
        }

        let hostBookings: any[] = [];
        if (userSpaces && userSpaces.length > 0) {
          const spaceIds = userSpaces.map(s => s.id);
          const { data: hostBookingsData, error: hostError } = await supabase
            .from('bookings')
            .select('id, booking_date, status, space_id')
            .in('space_id', spaceIds)
            .neq('user_id', authState.user.id)
            .order('booking_date', { ascending: false });

          if (hostError) {
            console.error('Error fetching host bookings:', hostError);
            throw hostError;
          }

          hostBookings = hostBookingsData || [];
        }

        // Combiniamo tutti i bookings
        const allBookings = [...(coworkerBookings || []), ...hostBookings];

        if (allBookings.length === 0) return [];

        // Otteniamo i dettagli degli spazi
        const spaceIds = [...new Set(allBookings.map(b => b.space_id))];
        const { data: spacesData, error: spacesDataError } = await supabase
          .from('spaces')
          .select('id, title, host_id')
          .in('id', spaceIds);

        if (spacesDataError) {
          console.error('Error fetching spaces data:', spacesDataError);
          throw spacesDataError;
        }

        // Combiniamo i dati
        const bookingsWithSpaces: BookingWithSpace[] = allBookings.map(booking => ({
          id: booking.id,
          booking_date: booking.booking_date,
          status: booking.status,
          space: spacesData?.find(space => space.id === booking.space_id) || null
        }));

        return bookingsWithSpaces;
      } catch (error) {
        console.error('Error in Messages query:', error);
        return [];
      }
    },
    enabled: !!authState.user?.id,
  });

  const handleBookingClick = (bookingId: string) => {
    navigate(`/messages/${bookingId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermata';
      case 'pending':
        return 'In attesa';
      case 'cancelled':
        return 'Cancellata';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Messaggi" subtitle="I tuoi messaggi di prenotazione">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Messaggi" subtitle="I tuoi messaggi di prenotazione">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/private-chats')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Chat Private
            </Button>
          </div>
        </div>

        {!bookings || bookings.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nessun messaggio
            </h3>
            <p className="text-gray-600">
              Non hai ancora messaggi relativi alle prenotazioni.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card 
                key={booking.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleBookingClick(booking.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {booking.space?.title || 'Spazio non disponibile'}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {new Date(booking.booking_date).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Clicca per visualizzare i messaggi
                    </span>
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Messages;
