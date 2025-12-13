
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, MapPin, Calendar } from "lucide-react";
import { ConnectionSuggestion } from "@/types/networking";
import { sendConnectionRequest } from "@/lib/networking-utils";
import { useNetworking } from "@/hooks/useNetworking";

interface SuggestionCardProps {
  suggestion: ConnectionSuggestion;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  const { fetchConnections, hasConnectionRequest } = useNetworking();
  const hasRequest = hasConnectionRequest(suggestion.user_id);

  const handleSendRequest = async () => {
    const success = await sendConnectionRequest(suggestion.user_id);
    if (success) {
      await fetchConnections();
    }
  };

  const getUserInitials = () => {
    return `${suggestion.first_name?.charAt(0) || ''}${suggestion.last_name?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={suggestion.avatar_url || ""} />
              <AvatarFallback className="text-lg">
                {getUserInitials()}
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
