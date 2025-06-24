
import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, MessageSquare, AlertTriangle } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

interface Booking {
  id: string;
  space_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  space: {
    title: string;
    address: string;
    host_id: string;
  };
}

export default function Bookings() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const cancelBookingMutation = useMutation({
    mutationFn: async ({ bookingId, isHost, reason }: { bookingId: string; isHost: boolean; reason?: string }) => {
      const { data, error } = await supabase.rpc('cancel_booking', {
        booking_id: bookingId,
        cancelled_by_host: isHost,
        reason: reason || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Prenotazione cancellata con successo");
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (error) => {
      console.error('Error cancelling booking:', error);
      toast.error("Errore nella cancellazione della prenotazione");
    }
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', authState.user?.id],
    queryFn: async () => {
      if (!authState.user) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          space:spaces (
            title,
            address,
            host_id
          )
        `)
        .eq('user_id', authState.user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!authState.user
  });

  const handleCancelBooking = (bookingId: string, isHost: boolean = false) => {
    if (cancelBookingMutation.isPending) return;
    
    const confirmMessage = isHost 
      ? "Sei sicuro di voler cancellare questa prenotazione come host?"
      : "Sei sicuro di voler cancellare questa prenotazione?";
      
    if (window.confirm(confirmMessage)) {
      cancelBookingMutation.mutate({ bookingId, isHost });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'In attesa', variant: 'secondary' as const },
      confirmed: { label: 'Confermata', variant: 'default' as const },
      cancelled: { label: 'Cancellata', variant: 'destructive' as const },
      completed: { label: 'Completata', variant: 'outline' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Accesso Richiesto</h2>
            <p className="text-gray-600 mb-4">Devi effettuare l'accesso per vedere le tue prenotazioni.</p>
            <Button onClick={() => navigate('/login')}>Accedi</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Le mie Prenotazioni</h1>
      
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna prenotazione
            </h3>
            <p className="text-gray-600 mb-4">
              Non hai ancora effettuato nessuna prenotazione.
            </p>
            <Button onClick={() => navigate('/spaces')}>
              Esplora gli spazi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{booking.space.title}</CardTitle>
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {booking.space.address}
                    </p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>
                        {format(new Date(booking.booking_date), 'PPP', { locale: it })}
                      </span>
                    </div>
                    
                    {booking.start_time && booking.end_time && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>
                          {booking.start_time} - {booking.end_time}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/messages/${booking.id}`)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Messaggi
                    </Button>
                    
                    {booking.status === 'pending' || booking.status === 'confirmed' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancelBookingMutation.isPending}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Cancella
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
