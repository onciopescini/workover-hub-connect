
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  UserPlus, 
  MapPin, 
  Calendar, 
  Users, 
  Star,
  Shield,
  Zap,
  TrendingUp,
  MessageCircle,
  Eye
} from 'lucide-react';
import { ConnectionSuggestion } from '@/types/networking';
import { sendConnectionRequest } from '@/lib/networking-utils';
import { useNetworking } from '@/hooks/useNetworking';

interface EnhancedSuggestionCardProps {
  suggestion: ConnectionSuggestion;
}

export const EnhancedSuggestionCard: React.FC<EnhancedSuggestionCardProps> = ({ 
  suggestion 
}) => {
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
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shared_event':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'similar_interests':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getCompatibilityLevel = () => {
    if (suggestion.score >= 85) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (suggestion.score >= 70) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (suggestion.score >= 50) return { level: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'Low', color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  // Mock professional data
  const professionalData = {
    title: "Senior Product Manager",
    company: "Innovation Labs",
    rating: 4.6,
    responseRate: "95%",
    isVerified: Math.random() > 0.3,
    isPremium: Math.random() > 0.6,
    mutualConnections: Math.floor(Math.random() * 20) + 5,
    recentActivity: Math.random() > 0.5 ? "Attivo oggi" : "Attivo 2 giorni fa"
  };

  const compatibility = getCompatibilityLevel();

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border border-gray-200 group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-gray-100">
                <AvatarImage src={user?.profile_photo_url || ""} />
                <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              {/* Compatibility indicator */}
              <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full ${compatibility.bg} border-2 border-white flex items-center justify-center`}>
                <span className={`text-xs font-bold ${compatibility.color}`}>
                  {suggestion.score}
                </span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </h3>
                {professionalData.isVerified && (
                  <Shield className="w-4 h-4 text-blue-500" />
                )}
                {professionalData.isPremium && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs">
                    Pro
                  </Badge>
                )}
              </div>

              {/* Professional info */}
              <p className="text-gray-700 font-medium text-sm">{professionalData.title}</p>
              <p className="text-gray-500 text-sm mb-2">{professionalData.company}</p>

              {/* Bio */}
              {user?.bio && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{user.bio}</p>
              )}
              
              {/* Tags and metrics */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge className={getReasonColor()}>
                  <div className="flex items-center gap-1">
                    {getReasonIcon()}
                    {getReasonLabel()}
                  </div>
                </Badge>
                
                <Badge variant="outline" className="text-xs">
                  <Star className="w-3 h-3 mr-1 text-yellow-500" />
                  {professionalData.rating}
                </Badge>

                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                  {professionalData.responseRate} response
                </Badge>
              </div>

              {/* Connection details */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {professionalData.mutualConnections} connessioni comuni
                </div>
                {suggestion.shared_context?.space_title && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {suggestion.shared_context.space_title}
                  </div>
                )}
                {suggestion.shared_context?.event_title && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {suggestion.shared_context.event_title}
                  </div>
                )}
              </div>

              {/* Activity status */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>{professionalData.recentActivity}</span>
                <Badge className={`${compatibility.bg} ${compatibility.color} border-0`}>
                  {compatibility.level} Match
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-2 ml-4">
            {hasRequest ? (
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                Richiesta inviata
              </Badge>
            ) : (
              <>
                <Button 
                  onClick={handleSendRequest}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Connetti
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Profilo
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick connect reason */}
        {suggestion.shared_context && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-gray-700">
                Connessione suggerita perché:
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {suggestion.reason === 'shared_space' && 
                `Avete entrambi utilizzato ${suggestion.shared_context.space_title || 'spazi simili'}`}
              {suggestion.reason === 'shared_event' && 
                `Avete partecipato a ${suggestion.shared_context.event_title || 'eventi simili'}`}
              {suggestion.reason === 'similar_interests' && 
                'Avete interessi professionali complementari'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
