import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle, TrendingUp } from 'lucide-react';
import { EnhancedNetworkingStats } from '@/types/networking-dashboard';

interface NetworkingStatsCardsProps {
  stats: EnhancedNetworkingStats;
}

export const NetworkingStatsCards = React.memo<NetworkingStatsCardsProps>(({ stats }) => {
  const statsData = [
    {
      label: 'Richieste Pendenti',
      value: stats.pendingRequests,
      icon: Users,
      color: 'text-orange-600',
      badge: '+12% questa settimana'
    },
    {
      label: 'Messaggi',
      value: stats.messagesThisWeek,
      icon: MessageCircle,
      color: 'text-blue-600',
      badge: 'Questa settimana'
    },
    {
      label: 'Visualizzazioni Profilo',
      value: stats.profileViews,
      icon: TrendingUp,
      color: 'text-green-600',
      badge: `+${stats.connectionRate}% tasso accettazione`
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statsData.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {stat.badge}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

NetworkingStatsCards.displayName = 'NetworkingStatsCards';