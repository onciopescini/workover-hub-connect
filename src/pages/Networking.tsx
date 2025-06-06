
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, UserPlus, MessageCircle, Calendar, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Networking = () => {
  const { authState } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for demonstration - in real app this would come from your networking service
  const connections = [
    {
      id: "1",
      name: "Marco Rossi",
      profession: "Designer",
      location: "Milano",
      avatar: "",
      status: "accepted",
      shared_spaces: 2,
      last_active: "2 giorni fa"
    },
    {
      id: "2", 
      name: "Sara Bianchi",
      profession: "Developer",
      location: "Roma",
      avatar: "",
      status: "pending",
      shared_spaces: 1,
      last_active: "1 settimana fa"
    }
  ];

  const suggestions = [
    {
      id: "3",
      name: "Luca Verdi",
      profession: "Marketing Manager",
      location: "Torino",
      avatar: "",
      shared_context: "Ha prenotato nello stesso spazio",
      match_score: 85
    },
    {
      id: "4",
      name: "Elena Neri",
      profession: "Architetto",
      location: "Firenze", 
      avatar: "",
      shared_context: "Partecipa agli stessi eventi",
      match_score: 92
    }
  ];

  const filteredConnections = connections.filter(conn =>
    conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.profession.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuggestions = suggestions.filter(sugg =>
    sugg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sugg.profession.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Accedi per il networking
            </h3>
            <p className="text-gray-600">
              Devi effettuare l'accesso per connetterti con altri professionisti.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Networking</h1>
          <p className="text-gray-600">
            Connettiti con professionisti che condividono i tuoi spazi ed eventi
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca per nome o professione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="connections" className="space-y-6">
          <TabsList>
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Le mie connessioni
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Suggerimenti
            </TabsTrigger>
          </TabsList>

          {/* Connections Tab */}
          <TabsContent value="connections">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredConnections.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nessuna connessione trovata
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery ? "Prova a modificare la ricerca" : "Inizia a connetterti con altri professionisti"}
                  </p>
                </div>
              ) : (
                filteredConnections.map((connection) => (
                  <Card key={connection.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={connection.avatar} />
                          <AvatarFallback>
                            {connection.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {connection.name}
                            </h3>
                            <Badge variant={connection.status === 'accepted' ? 'default' : 'secondary'}>
                              {connection.status === 'accepted' ? 'Connesso' : 'In attesa'}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-1">{connection.profession}</p>
                          
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                            <MapPin className="h-3 w-3" />
                            {connection.location}
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                            <Calendar className="h-3 w-3" />
                            {connection.shared_spaces} spazi condivisi • Attivo {connection.last_active}
                          </div>
                          
                          {connection.status === 'accepted' && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="flex-1">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Messaggio
                              </Button>
                              <Button size="sm" variant="outline">
                                Profilo
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuggestions.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <UserPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nessun suggerimento trovato
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery ? "Prova a modificare la ricerca" : "I suggerimenti appariranno man mano che utilizzi la piattaforma"}
                  </p>
                </div>
              ) : (
                filteredSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={suggestion.avatar} />
                          <AvatarFallback>
                            {suggestion.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {suggestion.name}
                            </h3>
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              {suggestion.match_score}% match
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-1">{suggestion.profession}</p>
                          
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                            <MapPin className="h-3 w-3" />
                            {suggestion.location}
                          </div>
                          
                          <p className="text-xs text-blue-600 mb-4">
                            {suggestion.shared_context}
                          </p>
                          
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Connetti
                            </Button>
                            <Button size="sm" variant="outline">
                              Profilo
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Networking;
