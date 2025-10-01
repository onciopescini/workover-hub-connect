import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { MessageList } from "@/components/messaging/MessageList";
import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from "@/lib/sre-logger";

const MessageConversation = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [bookingTitle, setBookingTitle] = useState<string>('');

  useEffect(() => {
    const fetchBookingTitle = async () => {
      if (!bookingId) return;

      try {
        // Assuming you have a Supabase client set up
        const { data, error } = await supabase
          .from('bookings')
          .select('spaces(title)')
          .eq('id', bookingId)
          .single();

        if (error) {
          sreLogger.error("Failed to fetch booking title", { bookingId }, error);
          setBookingTitle('Errore nel caricamento');
        } else if (data?.spaces?.title) {
          setBookingTitle(data.spaces.title);
        } else {
          setBookingTitle('Titolo non trovato');
        }
      } catch (error) {
        sreLogger.error("Error fetching booking title", { bookingId }, error as Error);
        setBookingTitle('Errore nel caricamento');
      }
    };

    fetchBookingTitle();
  }, [bookingId]);

  if (!authState.isAuthenticated) {
    // Redirect to login if not authenticated
    navigate('/login');
    return null;
  }

  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <CardTitle className="text-xl font-semibold mb-4">ID Prenotazione non valido</CardTitle>
            <p>Nessun ID di prenotazione fornito. Si prega di controllare l'URL.</p>
            <Button onClick={() => navigate('/bookings')}>Torna alle Prenotazioni</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto bg-white shadow overflow-hidden rounded-md">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg font-semibold">
              Conversazione - {bookingTitle || 'Caricamento...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MessageList bookingId={bookingId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessageConversation;
