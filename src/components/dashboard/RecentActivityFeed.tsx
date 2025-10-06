
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, Star, Clock, User, ArrowRight } from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { RecentActivity } from "@/hooks/queries/useEnhancedHostDashboard";

interface RecentActivityFeedProps {
  activities: RecentActivity[];
  onViewAll?: () => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities,
  onViewAll
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'review':
        return <Star className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityBadge = (type: string) => {
    const badges = {
      booking: { label: 'Prenotazione', variant: 'default' as const },
      message: { label: 'Messaggio', variant: 'secondary' as const },
      review: { label: 'Recensione', variant: 'outline' as const },
    };
    return badges[type as keyof typeof badges] || { label: 'Attività', variant: 'outline' as const };
  };

  // Limit to 5 activities
  const limitedActivities = activities.slice(0, 5);

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Attività Recenti
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {limitedActivities.length === 0 ? (
          <div className="text-center py-6">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-xs font-medium text-gray-900 mb-1">
              Nessuna attività recente
            </h3>
            <p className="text-xs text-gray-500">
              Le tue attività appariranno qui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {limitedActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-medium text-gray-900 truncate">
                      {activity.title}
                    </h4>
                    <Badge variant={getActivityBadge(activity.type).variant} className="ml-2 flex-shrink-0 text-[10px] h-4 px-1.5">
                      {getActivityBadge(activity.type).label}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-1 line-clamp-1">
                    {activity.description}
                  </p>
                  
                  <span className="text-[10px] text-gray-500">
                    {formatDistanceToNow(new Date(activity.created_at), { 
                      addSuffix: true, 
                      locale: it 
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
