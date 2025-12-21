import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MessageCircle, 
  UserMinus, 
  Star, 
  Shield, 
  MapPin, 
  Calendar,
  Eye,
  Clock,
  Verified,
  Users
} from 'lucide-react';
import { Connection } from '@/types/networking';
import { useAuth } from '@/hooks/auth/useAuth';
import { removeConnection, createOrGetPrivateChat } from '@/lib/networking-utils';
import { useNetworking } from '@/hooks/useNetworking';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface EnhancedConnectionCardProps {
  connection: Connection;
}

export function EnhancedConnectionCard({ connection }: EnhancedConnectionCardProps) {
  const { authState } = useAuth();
  const { fetchConnections } = useNetworking();
  const navigate = useNavigate();

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

  const getOnlineStatus = () => {
    // Mock online status - in real app this would come from presence data
    const random = Math.random();
    if (random > 0.7) return 'online';
    if (random > 0.4) return 'away';
    return 'offline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  // Dati profilo semplificati - i dati reali verranno integrati quando disponibili
  const professionalData = {
    title: otherUser?.bio || "Coworker",
    company: "", 
    rating: 0,
    reviewCount: 0,
    responseTime: "",
    isVerified: false,
    isPremium: false,
    sharedSpaces: 0,
    mutualConnections: 0
  };

  const onlineStatus = getOnlineStatus();

  if (!otherUser) return null;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar with online status */}
          <div className="relative">
            <Avatar className="w-16 h-16">
              <AvatarImage src={otherUser.profile_photo_url || undefined} />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                {getInitials(otherUser.first_name, otherUser.last_name)}
              </AvatarFallback>
            </Avatar>
            <div 
              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${getStatusColor(onlineStatus)}`}
              title={onlineStatus === 'online' ? 'Online' : onlineStatus === 'away' ? 'Assente' : 'Offline'}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Header with name and badges */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {otherUser.first_name} {otherUser.last_name}
                  </h3>
                  {professionalData.isVerified && (
                    <Verified className="w-5 h-5 text-blue-500" />
                  )}
                  {professionalData.isPremium && (
                    <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                      <Shield className="w-3 h-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                </div>
                
                <p className="text-gray-700 font-medium">{professionalData.title}</p>
                <p className="text-gray-500 text-sm">{professionalData.company}</p>
              </div>
              
              {/* Rating */}
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="font-medium">{professionalData.rating}</span>
                <span className="text-gray-500">({professionalData.reviewCount})</span>
              </div>
            </div>

            {/* Bio */}
            {otherUser.bio && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{otherUser.bio}</p>
            )}
            
            {/* Professional metrics */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{professionalData.sharedSpaces} spazi condivisi</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{professionalData.mutualConnections} connessioni comuni</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Risponde in {professionalData.responseTime}</span>
              </div>
            </div>

            {/* Status and time */}
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Verified className="w-3 h-3" />
                Connesso da {formatDistanceToNow(new Date(connection.created_at), { 
                  addSuffix: false, 
                  locale: it 
                })}
              </Badge>
              
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Eye className="w-3 h-3" />
                Online {onlineStatus === 'online' ? 'ora' : formatDistanceToNow(new Date(), { addSuffix: true, locale: it })}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleStartChat}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                size="sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Messaggio
              </Button>
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
                onClick={handleRemoveConnection}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <UserMinus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
