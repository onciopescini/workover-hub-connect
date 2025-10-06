
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
      description: 'Approva o rifiuta',
      icon: <Calendar className="w-4 h-4" />,
      onClick: () => navigate('/bookings'),
      badge: pendingBookings > 0 ? pendingBookings : undefined,
      badgeVariant: 'destructive' as const
    },
    {
      title: 'Messaggi',
      description: 'Rispondi ai tuoi ospiti',
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: () => navigate('/messages'),
      badge: unreadMessages > 0 ? unreadMessages : undefined,
      badgeVariant: 'default' as const
    },
    {
      title: 'Aggiungi Spazio',
      description: 'Pubblica nuovo spazio',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => navigate('/space/new'),
      highlight: true
    },
    {
      title: 'Gestisci Spazi',
      description: 'Modifica i tuoi spazi',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate('/host/spaces')
    },
  ];

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Azioni Rapide
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.highlight ? "default" : "outline"}
              className={`h-[72px] p-3 flex flex-col items-start text-left relative ${
                action.highlight ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' : ''
              }`}
              onClick={action.onClick}
            >
              {action.badge !== undefined && (
                <Badge 
                  variant={action.badgeVariant} 
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] flex items-center justify-center p-0"
                >
                  {action.badge}
                </Badge>
              )}
              
              <div className="flex items-center gap-2 mb-1">
                {action.icon}
                <span className="font-medium text-xs">
                  {action.title}
                </span>
              </div>
              
              <span className={`text-[10px] ${action.highlight ? 'text-white/80' : 'text-gray-600'}`}>
                {action.description}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
