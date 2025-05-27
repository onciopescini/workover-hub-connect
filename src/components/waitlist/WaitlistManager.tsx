
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Clock, 
  Users, 
  Calendar, 
  MapPin, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  UserPlus
} from "lucide-react";

interface WaitlistEntry {
  id: string;
  user_id: string;
  space_id?: string;
  event_id?: string;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  space?: {
    title: string;
    address: string;
    max_capacity: number;
  };
  event?: {
    title: string;
    date: string;
    max_participants: number;
    current_participants: number;
  };
}

export function WaitlistManager() {
  const { authState } = useAuth();
  const [waitlists, setWaitlists] = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('spaces');

  useEffect(() => {
    fetchWaitlists();
  }, [activeTab]);

  const fetchWaitlists = async () => {
    if (!authState.user) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('waitlists')
        .select(`
          *,
          user:user_id(first_name, last_name, profile_photo_url),
          space:space_id(title, address, max_capacity, host_id),
          event:event_id(title, date, max_participants, current_participants, created_by)
        `);

      if (activeTab === 'spaces') {
        query = query
          .not('space_id', 'is', null)
          .eq('space.host_id', authState.user.id);
      } else {
        query = query
          .not('event_id', 'is', null)
          .eq('event.created_by', authState.user.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: true });

      if (error) throw error;
      setWaitlists(data || []);
    } catch (error) {
      console.error('Error fetching waitlists:', error);
      toast.error('Errore nel caricamento delle liste d\'attesa');
    } finally {
      setIsLoading(false);
    }
  };

  const promoteFromWaitlist = async (entry: WaitlistEntry) => {
    try {
      if (entry.space_id) {
        // Promote to space booking - create a pending booking
        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            user_id: entry.user_id,
            space_id: entry.space_id,
            booking_date: new Date().toISOString().split('T')[0],
            status: 'pending'
          });

        if (bookingError) throw bookingError;
      } else if (entry.event_id) {
        // Promote to event participation
        const { error: participantError } = await supabase
          .from('event_participants')
          .insert({
            user_id: entry.user_id,
            event_id: entry.event_id
          });

        if (participantError) throw participantError;
      }

      // Remove from waitlist
      const { error: removeError } = await supabase
        .from('waitlists')
        .delete()
        .eq('id', entry.id);

      if (removeError) throw removeError;

      // Send notification
      await supabase
        .from('user_notifications')
        .insert({
          user_id: entry.user_id,
          type: 'waitlist_promotion',
          title: 'Promosso dalla lista d\'attesa!',
          content: activeTab === 'spaces' 
            ? `Ora puoi prenotare "${entry.space?.title}"`
            : `Ora sei iscritto all'evento "${entry.event?.title}"`,
          metadata: {
            [activeTab === 'spaces' ? 'space_id' : 'event_id']: 
              entry.space_id || entry.event_id,
            promoted_from_waitlist: true
          }
        });

      toast.success('Utente promosso dalla lista d\'attesa');
      fetchWaitlists();
    } catch (error) {
      console.error('Error promoting from waitlist:', error);
      toast.error('Errore nella promozione dalla lista d\'attesa');
    }
  };

  const removeFromWaitlist = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('waitlists')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      toast.success('Utente rimosso dalla lista d\'attesa');
      fetchWaitlists();
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      toast.error('Errore nella rimozione dalla lista d\'attesa');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="w-6 h-6 text-blue-500" />
        <h2 className="text-2xl font-bold">Gestione Liste d'Attesa</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="spaces" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Spazi
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Eventi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="spaces" className="space-y-4">
          {waitlists.filter(w => w.space_id).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessuna lista d'attesa per spazi
                </h3>
                <p className="text-gray-600">
                  Al momento non ci sono utenti in lista d'attesa per i tuoi spazi.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {waitlists.filter(w => w.space_id).map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {entry.user.profile_photo_url ? (
                              <img 
                                src={entry.user.profile_photo_url} 
                                alt="Profile" 
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {entry.user.first_name} {entry.user.last_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              In attesa per: {entry.space?.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {entry.space?.address}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(entry.created_at).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => promoteFromWaitlist(entry)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Promuovi
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromWaitlist(entry.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rimuovi
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {waitlists.filter(w => w.event_id).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessuna lista d'attesa per eventi
                </h3>
                <p className="text-gray-600">
                  Al momento non ci sono utenti in lista d'attesa per i tuoi eventi.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {waitlists.filter(w => w.event_id).map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {entry.user.profile_photo_url ? (
                              <img 
                                src={entry.user.profile_photo_url} 
                                alt="Profile" 
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {entry.user.first_name} {entry.user.last_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              In attesa per: {entry.event?.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {entry.event?.date && new Date(entry.event.date).toLocaleDateString('it-IT')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {entry.event?.current_participants}/{entry.event?.max_participants} partecipanti
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            In lista dal {new Date(entry.created_at).toLocaleDateString('it-IT')}
                          </div>
                        </div>

                        {entry.event && entry.event.current_participants >= entry.event.max_participants && (
                          <div className="mt-2">
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Evento al completo
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => promoteFromWaitlist(entry)}
                          disabled={entry.event && entry.event.current_participants >= entry.event.max_participants}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Promuovi
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromWaitlist(entry.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Rimuovi
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
