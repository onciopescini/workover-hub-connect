
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, MapPin, Calendar, Users, Eye, CheckCircle } from "lucide-react";
import { useNetworking } from "@/hooks/useNetworking";
import { useProfileAccess } from "@/hooks/useProfileAccess";
import { ProfileAccessBadge } from "@/components/profile/ProfileAccessBadge";
import { sendConnectionRequest } from "@/lib/networking-utils";
import { useNavigate } from "react-router-dom";

interface SuggestionCardProps {
  suggestion: {
    id: string;
    suggested_user_id: string;
    reason: string;
    score: number;
    shared_context?: {
      space_title?: string;
      event_title?: string;
    };
    suggested_user?: {
      first_name: string;
      last_name: string;
      profile_photo_url?: string;
      bio?: string;
    };
  };
}

export const EnhancedSuggestionCard = ({ suggestion }: SuggestionCardProps) => {
  const { fetchConnections, hasConnectionRequest } = useNetworking();
  const { accessResult } = useProfileAccess({ 
    userId: suggestion.suggested_user_id, 
    autoFetch: false 
  });
  const navigate = useNavigate();

  const handleSendRequest = async () => {
    const success = await sendConnectionRequest(suggestion.suggested_user_id);
    if (success) {
      await fetchConnections();
    }
  };

  const handleViewProfile = () => {
    navigate(`/profile/${suggestion.suggested_user_id}`);
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'shared_space':
        return 'Spazio condiviso';
      case 'shared_event':
        return 'Contesto condiviso';
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
        return 'bg-purple-100 text-purple-800';
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
        return <Users className="w-3 h-3" />;
      case 'similar_interests':
        return <Users className="w-3 h-3" />;
      default:
        return <Users className="w-3 h-3" />;
    }
  };

  const user = suggestion.suggested_user;
  const hasRequest = hasConnectionRequest(suggestion.suggested_user_id);

  if (!user) return null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profile_photo_url || ""} />
              <AvatarFallback className="text-lg">
                {getUserInitials(user.first_name, user.last_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {user.first_name} {user.last_name}
                </h3>
                <Badge className={getReasonColor(suggestion.reason)}>
                  <div className="flex items-center gap-1">
                    {getReasonIcon(suggestion.reason)}
                    {getReasonLabel(suggestion.reason)}
                  </div>
                </Badge>
              </div>

              {/* Badge di accesso al profilo */}
              {accessResult && (
                <div className="mb-2">
                  <ProfileAccessBadge 
                    accessReason={accessResult.access_reason}
                    visibilityLevel="limited"
                    className="text-xs"
                  />
                </div>
              )}
              
              {user.bio && (
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
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleViewProfile}
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
            >
              <Eye className="w-4 h-4 mr-2" />
              Profilo
            </Button>
            {hasRequest ? (
              <Badge variant="outline" className="flex items-center gap-1 justify-center">
                <CheckCircle className="w-3 h-3" />
                Richiesta inviata
              </Badge>
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
