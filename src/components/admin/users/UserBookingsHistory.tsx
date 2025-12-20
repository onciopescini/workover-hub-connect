import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin } from "lucide-react";

interface UserBookingsHistoryProps {
  userId: string;
}

export const UserBookingsHistory: React.FC<UserBookingsHistoryProps> = ({ userId }) => {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['user-bookings', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          guests_count,
          workspaces (
            name,
            city
          )
        `)
        .eq('user_id', userId)
        .order('booking_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="text-center py-4">Caricamento prenotazioni...</div>;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: 'bg-green-500/10 text-green-700',
      pending: 'bg-yellow-500/10 text-yellow-700',
      cancelled: 'bg-red-500/10 text-red-700',
      pending_approval: 'bg-blue-500/10 text-blue-700'
    };
    return colors[status] || '';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confirmed: 'Confermata',
      pending: 'In attesa',
      cancelled: 'Cancellata',
      pending_approval: 'Da approvare'
    };
    return labels[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ultime Prenotazioni</CardTitle>
      </CardHeader>
      <CardContent>
        {bookings && bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {(booking.workspaces as any)?.name || 'Spazio sconosciuto'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(booking.booking_date).toLocaleDateString()} - 
                      {booking.start_time} / {booking.end_time}
                    </span>
                    <span>• {booking.guests_count} {booking.guests_count === 1 ? 'ospite' : 'ospiti'}</span>
                  </div>
                </div>
                <Badge className={getStatusColor(booking.status || 'pending')}>
                  {getStatusLabel(booking.status || 'pending')}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna prenotazione trovata
          </div>
        )}
      </CardContent>
    </Card>
  );
};
