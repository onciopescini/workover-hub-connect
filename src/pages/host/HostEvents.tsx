
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, MapPin, Edit2, Trash2, Plus } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  max_participants: number;
  current_participants: number;
  status: string;
  space: {
    title: string;
    address: string;
  };
}

const HostEvents = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authState.user) {
      fetchEvents();
    }
  }, [authState.user]);

  const fetchEvents = async () => {
    if (!authState.user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          space:spaces (
            title,
            address
          )
        `)
        .eq('created_by', authState.user.id)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        toast.error('Errore nel caricamento degli eventi');
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error in fetchEvents:', error);
      toast.error('Errore nel caricamento degli eventi');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo evento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        toast.error('Errore nell\'eliminazione dell\'evento');
        return;
      }

      toast.success('Evento eliminato con successo');
      fetchEvents(); // Reload events
    } catch (error) {
      console.error('Error in deleteEvent:', error);
      toast.error('Errore nell\'eliminazione dell\'evento');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Attivo', variant: 'default' as const },
      completed: { label: 'Completato', variant: 'secondary' as const },
      cancelled: { label: 'Cancellato', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">I miei Eventi</h1>
        <Button onClick={() => navigate('/host/events/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Crea Evento
        </Button>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessun evento creato
            </h3>
            <p className="text-gray-600 mb-4">
              Non hai ancora creato nessun evento. Inizia a organizzare il tuo primo evento!
            </p>
            <Button onClick={() => navigate('/host/events/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Crea il tuo primo evento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{event.title}</CardTitle>
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {event.space?.title} - {event.space?.address}
                    </p>
                  </div>
                  {getStatusBadge(event.status)}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>
                        {format(new Date(event.date), 'PPP à p', { locale: it })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>
                        {event.current_participants} / {event.max_participants} partecipanti
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/host/events/${event.id}/edit`)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Modifica
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteEvent(event.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Elimina
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HostEvents;
