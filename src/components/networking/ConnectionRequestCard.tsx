
import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, User, Eye } from "lucide-react";
import { Connection } from "@/types/networking";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { acceptConnectionRequest, rejectConnectionRequest } from "@/lib/networking-utils";
import { useNetworking } from "@/hooks/useNetworking";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface ConnectionRequestCardProps {
  connection: Connection;
  type: 'sent' | 'received';
}

export function ConnectionRequestCard({ connection, type }: ConnectionRequestCardProps) {
  const { authState } = useAuth();
  const { fetchConnections } = useNetworking();
  const navigate = useNavigate();

  const isCurrentUserSender = connection.sender_id === authState.user?.id;
  const otherUser = isCurrentUserSender ? connection.receiver : connection.sender;

  const handleAccept = async () => {
    const success = await acceptConnectionRequest(connection.id);
    if (success) {
      await fetchConnections();
    }
  };

  const handleReject = async () => {
    const success = await rejectConnectionRequest(connection.id);
    if (success) {
      await fetchConnections();
    }
  };

  const handleViewProfile = () => {
    if (!otherUser) return;
    navigate(`/profile/${otherUser.id}`);
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getDaysUntilExpiry = () => {
    const expiryDate = new Date(connection.expires_at);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isExpiringSoon = getDaysUntilExpiry() <= 2;

  if (!otherUser) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start gap-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={otherUser.profile_photo_url || undefined} />
          <AvatarFallback>
            {getInitials(otherUser.first_name, otherUser.last_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {otherUser.first_name} {otherUser.last_name}
              </h3>
              {otherUser.bio && (
                <p className="text-gray-600 mt-1 text-sm line-clamp-2">
                  {otherUser.bio}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={type === 'sent' ? 'outline' : 'secondary'}>
                  <Clock className="w-3 h-3 mr-1" />
                  {type === 'sent' ? 'Inviata' : 'Ricevuta'} {formatDistanceToNow(new Date(connection.created_at), { 
                    addSuffix: true, 
                    locale: it 
                  })}
                </Badge>
                {type === 'received' && isExpiringSoon && (
                  <Badge variant="destructive">
                    Scade in {getDaysUntilExpiry()} giorni
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              <Button
                onClick={handleViewProfile}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-800"
              >
                <Eye className="w-4 h-4 mr-2" />
                Profilo
              </Button>
              
              {type === 'received' && (
                <>
                  <Button
                    onClick={handleAccept}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accetta
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Rifiuta
                  </Button>
                </>
              )}
              
              {type === 'sent' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  In attesa
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
