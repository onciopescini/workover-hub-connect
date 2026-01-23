
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Star, 
  Clock, 
  MapPin, 
  Award,
  Shield,
  Languages,
  Calendar
} from "lucide-react";

interface HostProfileSectionProps {
  host: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string | null;
    bio?: string;
    location?: string;
    created_at: string;
  };
  averageRating?: number | null;
  totalReviews?: number;
  totalSpaces?: number;
}

export const HostProfileSection: React.FC<HostProfileSectionProps> = ({ 
  host, 
  averageRating, 
  totalReviews = 0,
  totalSpaces = 0
}) => {
  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getJoinedDate = () => {
    const joinDate = new Date(host.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    
    if (diffMonths < 12) {
      return `${diffMonths} mesi`;
    } else {
      const years = Math.floor(diffMonths / 12);
      return `${years} ${years === 1 ? 'anno' : 'anni'}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Il Tuo Host
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="w-16 h-16">
            <AvatarImage src={host.profile_photo_url || undefined} />
            <AvatarFallback className="text-lg">
              {getInitials(host.first_name, host.last_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-semibold">
                {host.first_name} {host.last_name}
              </h3>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Award className="w-3 h-3 mr-1" />
                Superhost
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              {averageRating && totalReviews > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="font-medium">{averageRating.toFixed(1)}</span>
                  <span>({totalReviews} recensioni)</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{getJoinedDate()} su Workover</span>
              </div>
            </div>
            
            {host.location && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{host.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Host Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="font-semibold text-lg">98%</div>
            <div className="text-sm text-gray-600">Tasso risposta</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">&lt; 1h</div>
            <div className="text-sm text-gray-600">Tempo risposta</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-lg">{totalSpaces}</div>
            <div className="text-sm text-gray-600">Spazi gestiti</div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="outline" className="border-green-200 text-green-700">
            <Shield className="w-3 h-3 mr-1" />
            Identità verificata
          </Badge>
          <Badge variant="outline" className="border-blue-200 text-blue-700">
            <Languages className="w-3 h-3 mr-1" />
            Italiano, Inglese
          </Badge>
          <Badge variant="outline" className="border-purple-200 text-purple-700">
            <Clock className="w-3 h-3 mr-1" />
            Risposta rapida
          </Badge>
        </div>

        {/* Bio */}
        {host.bio && (
          <div>
            <p className="text-gray-700 text-sm leading-relaxed">{host.bio}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
