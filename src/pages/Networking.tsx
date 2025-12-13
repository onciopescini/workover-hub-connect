
import React, { useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, MessageCircle, TrendingUp } from "lucide-react";
import { useNetworking } from "@/hooks/useNetworking";
import { NetworkingDashboard } from "@/components/networking/NetworkingDashboard";
import { EnhancedConnectionCard } from "@/components/networking/EnhancedConnectionCard";
import { EnhancedSuggestionCard } from "@/components/networking/EnhancedSuggestionCard";
import { NetworkingSearch } from "@/components/networking/NetworkingSearch";
import { ConnectionRequestCard } from "@/components/networking/ConnectionRequestCard";

const Networking = () => {
  const { authState } = useAuth();
  const { 
    connections, 
    suggestions, 
    getSentRequests, 
    getReceivedRequests, 
    getActiveConnections 
  } = useNetworking();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<any>({});

  // Mock data for dashboard stats
  const dashboardStats = {
    totalConnections: getActiveConnections().length,
    pendingRequests: getReceivedRequests().length,
    messagesThisWeek: 24,
    profileViews: 89,
    connectionRate: 78
  };

  const savedSearches = [
    "Product Managers Milano",
    "Tech Startup Founders",
    "Digital Marketing Roma"
  ];

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setSearchFilters(filters);
    // In a real app, this would trigger API calls to search with filters
  };

  const filteredConnections = getActiveConnections().filter(conn => {
    if (!searchQuery) return true;
    const isCurrentUserSender = conn.sender_id === authState.user?.id;
    const otherUser = isCurrentUserSender ? conn.receiver : conn.sender;
    if (!otherUser) return false;
    
    const fullName = `${otherUser.first_name} ${otherUser.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) ||
           (otherUser.bio && otherUser.bio.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const filteredSuggestions = suggestions.filter(sugg => {
    if (!searchQuery) return true;
    const user = sugg.suggested_user;
    if (!user) return false;
    
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) ||
           (user.bio && user.bio.toLowerCase().includes(searchQuery.toLowerCase()));
  });

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
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Dashboard */}
        <NetworkingDashboard stats={dashboardStats} />

        {/* Search */}
        <NetworkingSearch 
          onSearch={handleSearch}
          savedSearches={savedSearches}
        />

        <Tabs defaultValue="connections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Connessioni ({getActiveConnections().length})
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Suggerimenti ({suggestions.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Inviate ({getSentRequests().length})
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Ricevute ({getReceivedRequests().length})
            </TabsTrigger>
          </TabsList>

          {/* Active Connections */}
          <TabsContent value="connections">
            <div className="space-y-4">
              {filteredConnections.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? "Nessuna connessione trovata" : "Nessuna connessione attiva"}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery ? "Prova a modificare la ricerca" : "Inizia a connetterti con altri professionisti"}
                  </p>
                </div>
              ) : (
                filteredConnections.map((connection) => (
                  <EnhancedConnectionCard 
                    key={connection.id} 
                    connection={connection} 
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Suggestions */}
          <TabsContent value="suggestions">
            <div className="space-y-4">
              {filteredSuggestions.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? "Nessun suggerimento trovato" : "Nessun suggerimento disponibile"}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery ? "Prova a modificare la ricerca" : "I suggerimenti appariranno man mano che utilizzi la piattaforma"}
                  </p>
                </div>
              ) : (
                filteredSuggestions.map((suggestion) => (
                  <EnhancedSuggestionCard 
                    key={`${suggestion.user_id}-${suggestion.workspace_name}`}
                    suggestion={suggestion}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Sent Requests */}
          <TabsContent value="sent">
            <div className="space-y-4">
              {getSentRequests().length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nessuna richiesta inviata
                  </h3>
                  <p className="text-gray-600">
                    Le richieste che invii appariranno qui
                  </p>
                </div>
              ) : (
                getSentRequests().map((connection) => (
                  <ConnectionRequestCard 
                    key={connection.id} 
                    connection={connection} 
                    type="sent"
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Received Requests */}
          <TabsContent value="received">
            <div className="space-y-4">
              {getReceivedRequests().length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nessuna richiesta ricevuta
                  </h3>
                  <p className="text-gray-600">
                    Le richieste che ricevi appariranno qui
                  </p>
                </div>
              ) : (
                getReceivedRequests().map((connection) => (
                  <ConnectionRequestCard 
                    key={connection.id} 
                    connection={connection} 
                    type="received"
                  />
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
