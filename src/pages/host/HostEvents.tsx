import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, MapPin, Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { EventWithDetails } from "@/types/event";
import { getHostEvents, deleteEvent } from "@/lib/host-event-utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";

const HostEvents = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all');

  useEffect(() => {
    if (authState.profile?.role !== "host") {
      navigate("/dashboard", { replace: true });
      return;
    }
    
    loadEvents();
  }, [authState.profile, navigate]);

  const loadEvents = async () => {
    if (!authState.user?.id) return;
    
    try {
      const hostEvents = await getHostEvents(authState.user.id);
      setEvents(hostEvents);
    } catch (error) {
      console.error("Error loading host events:", error);
      toast.error("Errore nel caricamento degli eventi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo evento?")) return;
    
    try {
      await deleteEvent(eventId);
      toast.success("Evento eliminato con successo");
      loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Errore nell'eliminazione dell'evento");
    }
  };

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.date);
    const now = new Date();
    
    switch (filter) {
      case 'active':
        return eventDate >= now && event.status === 'active';
      case 'past':
        return eventDate < now;
      default:
        return true;
    }
  });

  const getStatusBadge = (event: EventWithDetails) => {
    const eventDate = new Date(event.date);
    const now = new Date();
    
    if (eventDate < now) {
      return <Badge variant="outline">Passato</Badge>;
    }
    
    if (event.status === 'cancelled') {
      return <Badge variant="destructive">Cancellato</Badge>;
    }
    
    if (event.current_participants >= (event.max_participants || 0)) {
      return <Badge className="bg-orange-100 text-orange-800">Completo</Badge>;
    }
    
    return <Badge className="bg-green-100 text-green-800">Attivo</Badge>;
  };

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (authState.profile?.role !== "host") {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">I Miei Eventi</h1>
          <p className="text-gray-600">Gestisci i tuoi eventi e workshop</p>
        </div>
        <Button onClick={() => navigate('/host/events/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Evento
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Tutti ({events.length})</TabsTrigger>
          <TabsTrigger value="active">Attivi ({events.filter(e => new Date(e.date) >= new Date() && e.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="past">Passati ({events.filter(e => new Date(e.date) < new Date()).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'Nessun evento creato' : `Nessun evento ${filter === 'active' ? 'attivo' : 'passato'}`}
            </h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' ? 'Inizia creando il tuo primo evento per coinvolgere la community' : 'Cambia filtro per vedere altri eventi'}
            </p>
            {filter === 'all' && (
              <Button onClick={() => navigate('/host/events/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Crea Primo Evento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      {getStatusBadge(event)}
                    </div>
                    
                    {event.description && (
                      <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(event.date).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{event.current_participants || 0} / {event.max_participants || 0} partecipanti</span>
                      </div>
                      
                      {event.space && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{event.space.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/host/events/${event.id}/edit`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      Visualizza
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
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
