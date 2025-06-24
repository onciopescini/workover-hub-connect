import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { getEvent, joinEvent, leaveEvent, joinWaitlist, leaveWaitlist, getUserEventStatus, canJoinEvent } from "@/lib/event-utils";
import { EventWithDetails } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MapPin, Users, Clock, Calendar } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { it } from "date-fns/locale";
import LoadingScreen from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { Footer } from "@/components/layout/Footer";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const eventData = await getEvent(id);
        setEvent(eventData);
      } catch (error) {
        console.error("Error fetching event:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare l'evento",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [id, toast]);

  const handleJoinEvent = async () => {
    if (!event || !authState.user) return;

    try {
      setActionLoading(true);
      
      if (canJoinEvent(event)) {
        await joinEvent(event.id, authState.user.id);
        toast({
          title: "Iscrizione confermata!",
          description: "Ti sei iscritto all'evento con successo"
        });
      } else {
        await joinWaitlist(event.id, authState.user.id);
        toast({
          title: "Aggiunto alla lista d'attesa",
          description: "Ti contatteremo se si libera un posto"
        });
      }

      // Refresh event data
      const updatedEvent = await getEvent(event.id);
      setEvent(updatedEvent);
    } catch (error) {
      console.error("Error joining event:", error);
      toast({
        title: "Errore",
        description: "Impossibile iscriversi all'evento",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveEvent = async () => {
    if (!event || !authState.user) return;

    try {
      setActionLoading(true);
      const userStatus = getUserEventStatus(event, authState.user.id);
      
      if (userStatus === 'participant') {
        await leaveEvent(event.id, authState.user.id);
        toast({
          title: "Disiscrizione confermata",
          description: "Ti sei disiscritto dall'evento"
        });
      } else if (userStatus === 'waitlist') {
        await leaveWaitlist(event.id, authState.user.id);
        toast({
          title: "Rimosso dalla lista d'attesa",
          description: "Sei stato rimosso dalla lista d'attesa"
        });
      }

      // Refresh event data
      const updatedEvent = await getEvent(event.id);
      setEvent(updatedEvent);
    } catch (error) {
      console.error("Error leaving event:", error);
      toast({
        title: "Errore",
        description: "Impossibile annullare l'iscrizione",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getEventStatus = () => {
    if (!event) return null;
    
    const maxParticipants = event.max_participants || 0;
    const currentParticipants = event.current_participants || 0;
    
    if (currentParticipants >= maxParticipants) {
      return { label: "Completo", variant: "destructive" as const };
    }
    
    const spotsLeft = maxParticipants - currentParticipants;
    return { 
      label: `${spotsLeft} posti disponibili`, 
      variant: "default" as const 
    };
  };

  const getUserActionButton = () => {
    if (!authState.user || !event) return null;

    const userStatus = getUserEventStatus(event, authState.user.id);
    const eventStatus = getEventStatus();

    if (userStatus === 'participant') {
      return (
        <Button 
          variant="outline" 
          onClick={handleLeaveEvent}
          disabled={actionLoading}
          className="w-full"
        >
          Annulla partecipazione
        </Button>
      );
    }

    if (userStatus === 'waitlist') {
      return (
        <Button 
          variant="outline" 
          onClick={handleLeaveEvent}
          disabled={actionLoading}
          className="w-full"
        >
          Esci dalla lista d'attesa
        </Button>
      );
    }

    if (canJoinEvent(event)) {
      return (
        <Button 
          onClick={handleJoinEvent}
          disabled={actionLoading}
          className="w-full"
        >
          Iscriviti all'evento
        </Button>
      );
    }

    return (
      <Button 
        variant="secondary"
        onClick={handleJoinEvent}
        disabled={actionLoading}
        className="w-full"
      >
        Entra in lista d'attesa
      </Button>
    );
  };

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (!authState.isAuthenticated && !authState.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-white rounded-lg shadow-md p-8 text-center space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Vuoi visualizzare i dettagli di questo evento?
            </h2>
            <p className="mb-6 text-gray-600">
              Per vedere i dettagli e partecipare all'evento è necessario registrarsi o effettuare il login.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => navigate('/login')} className="bg-indigo-600 text-white">
                Accedi
              </Button>
              <Button onClick={() => navigate('/register')} variant="outline">
                Registrati
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Evento non trovato</h2>
          <Button onClick={() => navigate('/')}>Torna alla home</Button>
        </div>
      </div>
    );
  }

  const eventStatus = getEventStatus();
  const userStatus = authState.user ? getUserEventStatus(event, authState.user.id) : 'not_joined';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Back Button */}
        <div className="mb-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Indietro
          </Button>
        </div>

        {/* Event Image */}
        {event.image_url && (
          <div className="aspect-video rounded-lg overflow-hidden">
            <img 
              src={event.image_url} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Event Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl">{event.title}</CardTitle>
                {eventStatus && (
                  <Badge variant={eventStatus.variant} className="mt-2">
                    {eventStatus.label}
                  </Badge>
                )}
                {userStatus !== 'not_joined' && (
                  <Badge 
                    variant={userStatus === 'participant' ? 'default' : 'secondary'} 
                    className="mt-2 ml-2"
                  >
                    {userStatus === 'participant' ? 'Iscritto' : 'In lista d\'attesa'}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date and Time */}
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {format(new Date(event.date), "EEEE d MMMM yyyy 'alle' HH:mm", { locale: it })}
              </span>
            </div>

            {/* Space */}
            {event.space && (
              <div className="flex items-center space-x-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <div className="text-sm">
                  <span className="font-medium">{event.space.title}</span>
                  <br />
                  <span className="text-gray-500">{event.space.address}</span>
                </div>
              </div>
            )}

            {/* Participants Count */}
            <div className="flex items-center space-x-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span className="text-sm">
                {event.current_participants || 0} / {event.max_participants || 0} partecipanti
              </span>
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Descrizione</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {/* Action Button */}
            {authState.user && (
              <div className="pt-4">
                {getUserActionButton()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants */}
        {event.participants && event.participants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Partecipanti ({event.participants.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.participants.map((participant) => (
                  <div key={participant.user_id} className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.user?.profile_photo_url || undefined} />
                      <AvatarFallback>
                        {participant.user?.first_name?.[0]}{participant.user?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {participant.user?.first_name} {participant.user?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Iscritto {participant.joined_at && 
                          formatDistanceToNow(new Date(participant.joined_at), { 
                            addSuffix: true, 
                            locale: it 
                          })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waitlist */}
        {event.waitlist && event.waitlist.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lista d'attesa ({event.waitlist.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.waitlist.map((entry, index) => (
                  <div key={entry.id} className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.user?.profile_photo_url || undefined} />
                      <AvatarFallback>
                        {entry.user?.first_name?.[0]}{entry.user?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.user?.first_name} {entry.user?.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        In attesa da {entry.created_at && 
                          formatDistanceToNow(new Date(entry.created_at), { 
                            addSuffix: true, 
                            locale: it 
                          })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
