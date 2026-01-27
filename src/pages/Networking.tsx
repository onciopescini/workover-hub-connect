import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, MessageCircle, TrendingUp } from "lucide-react";
import { useNetworking, type SearchFilters } from "@/hooks/useNetworking";
import { NetworkingDashboard } from "@/components/networking/NetworkingDashboard";
import { EnhancedConnectionCard } from "@/components/networking/EnhancedConnectionCard";
import { EnhancedSuggestionCard } from "@/components/networking/EnhancedSuggestionCard";
import { NetworkingSearch } from "@/components/networking/NetworkingSearch";
import { ConnectionRequestCard } from "@/components/networking/ConnectionRequestCard";
import { WhosHereList } from "@/components/networking/WhosHereList";
import { EnhancedConnectionCard as SearchResultCard } from "@/components/networking/EnhancedConnectionCard";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNetworkingStats } from "@/hooks/useNetworkingStats";

const Networking = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { 
    connections, 
    suggestions, 
    getSentRequests, 
    getReceivedRequests, 
    getActiveConnections,
    searchCoworkers,
    searchResults,
    isSearching,
    clearSearch
  } = useNetworking();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});

  // Fetch real networking stats from RPC
  const { data: networkingStats } = useNetworkingStats();

  // Real data for dashboard stats (no more mock data!)
  const dashboardStats = {
    totalConnections: getActiveConnections().length,
    pendingRequests: getReceivedRequests().length,
    messagesThisWeek: networkingStats?.messagesThisWeek ?? 0,
    profileViews: networkingStats?.profileViews ?? 0,
    connectionRate: networkingStats?.connectionRate ?? 0
  };

  const savedSearches = [
    "Product Managers Milano",
    "Tech Startup Founders",
    "Digital Marketing Roma"
  ];

  const handleSearch = (query: string, filters: SearchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);

    // If filters are active or query is present, trigger server-side search
    if (query || Object.values(filters).some(val => val)) {
      searchCoworkers(query, filters);
    } else {
      clearSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchFilters({});
    clearSearch();
  };

  // Client-side filtering only for active connections/suggestions when NOT in global search mode
  const filteredConnections = getActiveConnections().filter(conn => {
    if (isSearching) return true; // Don't filter here if global searching
    if (!searchQuery) return true;
    const isCurrentUserSender = conn.sender_id === authState.user?.id;
    const otherUser = isCurrentUserSender ? conn.receiver : conn.sender;
    if (!otherUser) return false;
    
    const fullName = `${otherUser.first_name} ${otherUser.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) ||
           (otherUser.bio && otherUser.bio.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const filteredSuggestions = suggestions.filter(sugg => {
    if (isSearching) return true;
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

        {/* Who's Here Section */}
        <WhosHereList />

        {isSearching ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Risultati Ricerca ({searchResults.length})</h2>
              <Button variant="ghost" onClick={handleClearSearch} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <X className="w-4 h-4 mr-2" />
                Cancella Filtri
              </Button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessun risultato trovato
                </h3>
                <p className="text-gray-600">
                  Prova a modificare i filtri di ricerca
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((coworker) => (
                  // Using EnhancedConnectionCard as a base, adapting it for search results (Coworker type)
                  // In a real scenario we might want a dedicated CoworkerCard if actions differ significantly
                  <SearchResultCard
                    key={coworker.id}
                    connection={{
                      id: `temp-${coworker.id}`,
                      sender_id: authState.user?.id || '',
                      receiver_id: coworker.id,
                      status: 'pending', // Dummy status, logic should check real status
                      created_at: new Date().toISOString(),
                      expires_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      sender: {
                        id: authState.user?.id || '',
                        first_name: authState.profile?.first_name || '',
                        last_name: authState.profile?.last_name || '',
                      },
                      receiver: {
                        id: coworker.id,
                        first_name: coworker.first_name,
                        last_name: coworker.last_name,
                        profile_photo_url: coworker.avatar_url,
                        bio: coworker.bio,
                      }
                    }}
                    // We might need to pass a prop to hide specific connection actions if not connected
                    // For now, re-using card for display.
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
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
                      key={`${suggestion.user_id}-${suggestion.space_name}`}
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
        )}
      </div>
    </div>
  );
};

export default Networking;
