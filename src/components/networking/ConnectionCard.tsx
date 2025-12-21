
import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, UserMinus, User, Eye } from "lucide-react";
import { Connection } from "@/types/networking";
import { useAuth } from "@/hooks/auth/useAuth";
import { removeConnection, createOrGetPrivateChat } from "@/lib/networking-utils";
import { useNetworking } from "@/hooks/useNetworking";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ConnectionCardProps {
  connection: Connection;
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  const { authState } = useAuth();
  const { fetchConnections } = useNetworking();
  const navigate = useNavigate();

  // Determine which user is the "other" user
  const isCurrentUserSender = connection.sender_id === authState.user?.id;
  const otherUser = isCurrentUserSender ? connection.receiver : connection.sender;

  const handleRemoveConnection = async () => {
    const success = await removeConnection(connection.id);
    if (success) {
      await fetchConnections();
    }
  };

  const handleStartChat = async () => {
    if (!otherUser) return;
    
    const chatId = await createOrGetPrivateChat(otherUser.id);
    if (chatId) {
      navigate(`/messages?id=${chatId}`);
    } else {
      toast.error("Impossibile avviare la chat");
    }
  };

  const handleViewProfile = () => {
    if (!otherUser) return;
    navigate(`/users/${otherUser.id}`);
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

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
              <Badge variant="secondary" className="mt-2">
                <User className="w-3 h-3 mr-1" />
                Connesso
              </Badge>
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
              <Button
                onClick={handleStartChat}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>
              <Button
                onClick={handleRemoveConnection}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Rimuovi
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
