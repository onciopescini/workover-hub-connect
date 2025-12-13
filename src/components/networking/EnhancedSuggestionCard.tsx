
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, MapPin, Eye, CheckCircle, Calendar } from "lucide-react";
import { useNetworking } from "@/hooks/useNetworking";
import { useProfileAccess } from "@/hooks/useProfileAccess";
import { ProfileAccessBadge } from "@/components/profile/ProfileAccessBadge";
import { sendConnectionRequest } from "@/lib/networking-utils";
import { useNavigate } from "react-router-dom";
import { ConnectionSuggestion } from "@/types/networking";

interface SuggestionCardProps {
  suggestion: ConnectionSuggestion;
}

export const EnhancedSuggestionCard = ({ suggestion }: SuggestionCardProps) => {
  const { fetchConnections, hasConnectionRequest } = useNetworking();
  const { accessResult } = useProfileAccess({ 
    userId: suggestion.user_id,
    autoFetch: false 
  });
  const navigate = useNavigate();

  const handleSendRequest = async () => {
    const success = await sendConnectionRequest(suggestion.user_id);
    if (success) {
      await fetchConnections();
    }
  };

  const handleViewProfile = () => {
    navigate(`/users/${suggestion.user_id}`);
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  const hasRequest = hasConnectionRequest(suggestion.user_id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={suggestion.avatar_url || ""} />
              <AvatarFallback className="text-lg">
                {getUserInitials(suggestion.first_name, suggestion.last_name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {suggestion.first_name} {suggestion.last_name}
                </h3>
                <Badge className="bg-blue-100 text-blue-800">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Spazio condiviso
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
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {suggestion.workspace_name}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(suggestion.booking_date).toLocaleDateString()}
                </div>
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
