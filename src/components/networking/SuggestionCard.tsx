
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, MapPin, Calendar, Users } from "lucide-react";
import { ConnectionSuggestion } from "@/types/networking";
import { sendConnectionRequest } from "@/lib/networking-utils";
import { useNetworking } from "@/hooks/useNetworking";

interface SuggestionCardProps {
  suggestion: ConnectionSuggestion;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  const { fetchConnections, hasConnectionRequest } = useNetworking();
  const user = suggestion.suggested_user;
  const hasRequest = hasConnectionRequest(suggestion.suggested_user_id);

  const handleSendRequest = async () => {
    const success = await sendConnectionRequest(suggestion.suggested_user_id);
    if (success) {
      await fetchConnections();
    }
  };

  const getUserInitials = () => {
    return `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  const getReasonLabel = () => {
    switch (suggestion.reason) {
      case 'shared_space':
        return 'Spazio condiviso';
      case 'shared_event':
        return 'Evento condiviso';
      case 'similar_interests':
        return 'Interessi simili';
      default:
        return suggestion.reason;
    }
  };

  const getReasonColor = () => {
    switch (suggestion.reason) {
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

  const getReasonIcon = () => {
    switch (suggestion.reason) {
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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user?.profile_photo_url || ""} />
              <AvatarFallback className="text-lg">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </h3>
                <Badge className={getReasonColor()}>
                  <div className="flex items-center gap-1">
                    {getReasonIcon()}
                    {getReasonLabel()}
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
          
          <div>
            {hasRequest ? (
              <Badge variant="outline">Richiesta inviata</Badge>
            ) : (
              <Button 
                onClick={handleSendRequest}
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
};
