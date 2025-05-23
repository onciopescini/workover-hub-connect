
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, MapPin, Calendar, Users } from "lucide-react";
import { ConnectionSuggestion } from "@/types/networking";
import { sendConnectionRequest } from "@/lib/networking-utils";
import { useNetworking } from "@/hooks/useNetworking";

interface SuggestionCardProps {
  suggestion: ConnectionSuggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { fetchSuggestions, hasConnectionRequest } = useNetworking();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isIgnored, setIsIgnored] = useState(false);

  const user = suggestion.suggested_user;
  const hasExistingRequest = hasConnectionRequest(suggestion.suggested_user_id);

  const handleConnect = async () => {
    if (!user || hasExistingRequest) return;
    
    setIsConnecting(true);
    const success = await sendConnectionRequest(user.id);
    if (success) {
      await fetchSuggestions();
    }
    setIsConnecting(false);
  };

  const handleIgnore = () => {
    setIsIgnored(true);
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getReasonIcon = () => {
    switch (suggestion.reason) {
      case 'shared_space':
        return <MapPin className="w-3 h-3" />;
      case 'shared_event':
        return <Calendar className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  const getReasonText = () => {
    switch (suggestion.reason) {
      case 'shared_space':
        return `Spazio condiviso: ${suggestion.shared_context?.space_title || 'Sconosciuto'}`;
      case 'shared_event':
        return `Evento condiviso: ${suggestion.shared_context?.event_title || 'Sconosciuto'}`;
      default:
        return 'Interessi simili';
    }
  };

  const getReasonColor = () => {
    switch (suggestion.reason) {
      case 'shared_space':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'shared_event':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  if (isIgnored || !user) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start gap-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={user.profile_photo_url || undefined} />
          <AvatarFallback>
            {getInitials(user.first_name, user.last_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {user.first_name} {user.last_name}
              </h3>
              {user.bio && (
                <p className="text-gray-600 mt-1 text-sm line-clamp-2">
                  {user.bio}
                </p>
              )}
              
              <div className="flex items-center gap-2 mt-3">
                <Badge className={`border ${getReasonColor()}`}>
                  {getReasonIcon()}
                  <span className="ml-1">{getReasonText()}</span>
                </Badge>
                
                <Badge variant="outline" className="text-xs">
                  Punteggio: {suggestion.score}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              {hasExistingRequest ? (
                <Badge variant="outline" className="px-4 py-2">
                  Richiesta già inviata
                </Badge>
              ) : (
                <>
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isConnecting ? 'Connessione...' : 'Connetti'}
                  </Button>
                  <Button
                    onClick={handleIgnore}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-gray-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Ignora
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
