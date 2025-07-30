
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  MessageSquare, 
  Plus, 
  Settings, 
  BarChart3,
  Users,
  Clock,
  CheckCircle
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  pendingBookings: number;
  unreadMessages: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  pendingBookings,
  unreadMessages
}) => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Gestisci Prenotazioni',
      description: 'Approva o rifiuta le richieste',
      icon: <Calendar className="w-5 h-5" />,
      onClick: () => navigate('/bookings'),
      badge: pendingBookings > 0 ? pendingBookings : undefined,
      badgeVariant: 'destructive' as const
    },
    {
      title: 'Messaggi',
      description: 'Rispondi ai tuoi ospiti',
      icon: <MessageSquare className="w-5 h-5" />,
      onClick: () => navigate('/messages'),
      badge: unreadMessages > 0 ? unreadMessages : undefined,
      badgeVariant: 'default' as const
    },
    {
      title: 'Aggiungi Spazio',
      description: 'Pubblica un nuovo spazio',
      icon: <Plus className="w-5 h-5" />,
      onClick: () => navigate('/space/new'),
      highlight: true
    },
    {
      title: 'Gestisci Spazi',
      description: 'Modifica i tuoi spazi',
      icon: <Settings className="w-5 h-5" />,
      onClick: () => navigate('/host/spaces')
    },
    {
      title: 'Analytics',
      description: 'Visualizza le performance',
      icon: <BarChart3 className="w-5 h-5" />,
      onClick: () => navigate('/host/analytics')
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Azioni Rapide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.highlight ? "default" : "outline"}
              className={`h-auto p-4 flex flex-col items-start text-left relative ${
                action.highlight ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : ''
              }`}
              onClick={action.onClick}
            >
              {action.badge !== undefined && (
                <Badge 
                  variant={action.badgeVariant} 
                  className="absolute -top-2 -right-2 min-w-[20px] h-5 text-xs flex items-center justify-center"
                >
                  {action.badge}
                </Badge>
              )}
              
              <div className="flex items-center gap-3 mb-2">
                {action.icon}
                <span className="font-medium">
                  {action.title}
                </span>
              </div>
              
              <span className={`text-sm ${action.highlight ? 'text-white/80' : 'text-gray-600'}`}>
                {action.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
