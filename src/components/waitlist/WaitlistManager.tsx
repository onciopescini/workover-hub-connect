
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Users, Search, UserPlus, X, MapPin } from "lucide-react";

interface WaitlistEntry {
  id: string;
  user_id: string;
  space_id: string | null;
  created_at: string | null;
  user: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  space?: {
    title: string;
    max_capacity: number;
  };
}

export function WaitlistManager() {
  const [waitlists, setWaitlists] = useState<WaitlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    fetchWaitlists();
  }, []);

  const fetchWaitlists = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('waitlists')
        .select(`
          *,
          user:profiles!user_id(first_name, last_name, profile_photo_url),
          space:spaces(title, max_capacity)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type-safe filtering to remove entries with missing relations
      const validWaitlists: WaitlistEntry[] = (data || [])
        .filter(entry => entry.user && entry.space_id)
        .map(entry => ({
          ...entry,
          space_id: entry.space_id ?? '',
          created_at: entry.created_at ?? new Date().toISOString(),
          user: entry.user as WaitlistEntry['user'],
          space: entry.space ?? { title: '', max_capacity: 0 }
        }));

      setWaitlists(validWaitlists);
    } catch (error) {
      console.error('Error fetching waitlists:', error);
      toast.error('Errore nel caricamento delle liste d\'attesa');
    } finally {
      setIsLoading(false);
    }
  };

  const promoteUser = async (waitlistId: string, spaceId?: string) => {
    try {
      if (spaceId) {
        // For spaces, we would need to create a booking
        // This is a simplified version - you'd need to implement actual booking logic
        toast.info('Funzionalità di promozione per spazi non ancora implementata');
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Errore nella promozione dell\'utente');
    }
  };

  const removeFromWaitlist = async (waitlistId: string) => {
    try {
      const { error } = await supabase
        .from('waitlists')
        .delete()
        .eq('id', waitlistId);

      if (error) throw error;

      toast.success('Utente rimosso dalla lista d\'attesa');
      fetchWaitlists();
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      toast.error('Errore nella rimozione dalla lista d\'attesa');
    }
  };

  const filteredWaitlists = waitlists.filter(entry => {
    const matchesSearch = 
      entry.user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.space?.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = entry.space_id;

    return matchesSearch && matchesFilter;
  });

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-6 h-6 text-orange-500" />
          <h2 className="text-2xl font-bold">Gestione Liste d'Attesa</h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Cerca utenti o contenuti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{waitlists.length}</div>
                <div className="text-sm text-gray-600">Totale in attesa</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {waitlists.filter(w => w.space_id).length}
                </div>
                <div className="text-sm text-gray-600">Spazi</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
      </div>

      {/* Waitlist entries */}
      {filteredWaitlists.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna lista d'attesa
            </h3>
            <p className="text-gray-600">
              Non ci sono utenti in lista d'attesa al momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredWaitlists.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      {entry.user.profile_photo_url ? (
                        <img
                          src={entry.user.profile_photo_url}
                          alt={`${entry.user.first_name} ${entry.user.last_name}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {entry.user.first_name} {entry.user.last_name}
                      </h3>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">
                          <MapPin className="w-3 h-3 mr-1" />
                          Spazio: {entry.space?.title}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-500 mt-1">
                        In attesa dal {entry.created_at ? new Date(entry.created_at).toLocaleDateString('it-IT') : 'Data sconosciuta'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => promoteUser(entry.id, entry.space_id || undefined)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Promuovi
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFromWaitlist(entry.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Rimuovi
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
}
