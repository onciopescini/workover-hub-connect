import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BOOKING_DETAIL_TABLE, bookingDetailQueryKeys } from '@/constants/booking-detail';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';


type BookingStatus = NonNullable<Database['public']['Tables']['bookings']['Row']['status']>;

interface BookingDetailRecord {
  id: string;
  booking_date: string;
  status: BookingStatus | null;
  space: {
    title: string;
  } | null;
}

const formatStatus = (status: BookingStatus | null): string => {
  if (!status) {
    return 'Sconosciuto';
  }

  return status.replaceAll('_', ' ');
};

const formatDate = (dateIso: string): string => {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'full',
  }).format(new Date(dateIso));
};

const BookingDetail = () => {
  const { id } = useParams<{ id: string }>();

  const bookingQuery = useQuery({
    queryKey: bookingDetailQueryKeys.detail(id ?? 'missing-id'),
    enabled: Boolean(id),
    queryFn: async (): Promise<BookingDetailRecord | null> => {
      if (!id) {
        return null;
      }

      const { data, error } = await supabase
        .from(BOOKING_DETAIL_TABLE)
        .select(`
          id,
          booking_date,
          status,
          space:spaces!bookings_space_id_fkey(title)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .returns<BookingDetailRecord[]>()
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  if (bookingQuery.isLoading) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Caricamento prenotazione...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (bookingQuery.isError) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Errore nel caricamento</CardTitle>
            <CardDescription>
              Non siamo riusciti a recuperare questa prenotazione. Riprova tra qualche minuto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/bookings">Torna alle prenotazioni</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bookingQuery.data) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Prenotazione non trovata (404)</CardTitle>
            <CardDescription>
              Il link potrebbe essere scaduto o la prenotazione non è più disponibile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/bookings">Vai alle tue prenotazioni</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio prenotazione</CardTitle>
          <CardDescription>ID: {bookingQuery.data.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Spazio</p>
            <p className="font-medium">{bookingQuery.data.space?.title ?? 'Spazio non disponibile'}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Data</p>
            <p className="font-medium">{formatDate(bookingQuery.data.booking_date)}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Stato</p>
            <Badge variant="secondary" className="capitalize">
              {formatStatus(bookingQuery.data.status)}
            </Badge>
          </div>

          <Button asChild variant="outline">
            <Link to="/bookings">Torna alle prenotazioni</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingDetail;
