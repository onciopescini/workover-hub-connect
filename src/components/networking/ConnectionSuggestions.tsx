
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, MapPin, Calendar, Users, RefreshCw, Eye } from "lucide-react";
import { useNetworking } from "@/hooks/useNetworking";
import { sendConnectionRequest } from "@/lib/networking-utils";
import { useNavigate } from "react-router-dom";

export const ConnectionSuggestions = () => {
  const { suggestions, refreshSuggestions, fetchConnections, hasConnectionRequest } = useNetworking();
  const navigate = useNavigate();

  const handleSendRequest = async (userId: string) => {
    const success = await sendConnectionRequest(userId);
    if (success) {
      await fetchConnections();
      await refreshSuggestions();
    }
  };

  const handleRefresh = async () => {
    await refreshSuggestions();
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'shared_space':
        return 'Spazio condiviso';
      case 'shared_event':
        return 'Evento condiviso';
      case 'similar_interests':
        return 'Interessi simili';
      default:
        return reason;
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'shared_space':
        return 'bg-blue-100 text-blue-800';
      case 'shared_event':
        return 'bg-green-100 text-green-800';
      case 'similar_interests':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'shared_space':
        return <MapPin className="w-3 h-3" />;
      case 'shared_event':
        return <Calendar className="w-3 h-3" />;
      case 'similar_interests':
        return <Users className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Suggerimenti di Connessione</h2>
          <p className="text-gray-600 mt-1">
            Persone che potresti conoscere basate sui tuoi spazi ed eventi
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nessun suggerimento disponibile
            </h3>
            <p className="text-gray-600 mb-4">
              Partecipa a più spazi ed eventi per ricevere suggerimenti personalizzati
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Controlla di nuovo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((suggestion) => {
            const user = suggestion.suggested_user;
            const hasRequest = hasConnectionRequest(suggestion.suggested_user_id);
            
            return (
              <Card key={suggestion.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={user?.profile_photo_url || ""} />
                        <AvatarFallback className="text-lg">
                          {getUserInitials(user?.first_name, user?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user?.first_name} {user?.last_name}
                          </h3>
                          <Badge className={getReasonColor(suggestion.reason)}>
                            <div className="flex items-center gap-1">
                              {getReasonIcon(suggestion.reason)}
                              {getReasonLabel(suggestion.reason)}
                            </div>
                          </Badge>
                        </div>
                        
                        {user?.bio && (
                          <p className="text-gray-600 mb-3 line-clamp-2">{user.bio}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Score: {suggestion.score}
                          </div>
                          {suggestion.shared_context?.space_title && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {suggestion.shared_context.space_title}
                            </div>
                          )}
                          {suggestion.shared_context?.event_title && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {suggestion.shared_context.event_title}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleViewProfile(suggestion.suggested_user_id)}
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Profilo
                      </Button>
                      {hasRequest ? (
                        <Badge variant="outline">Richiesta inviata</Badge>
                      ) : (
                        <Button 
                          onClick={() => handleSendRequest(suggestion.suggested_user_id)}
                          size="sm"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Connetti
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
