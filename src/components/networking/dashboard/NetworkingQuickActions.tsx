import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, MessageCircle, Calendar, Zap } from 'lucide-react';
import { frontendLogger } from '@/utils/frontend-logger';

export const NetworkingQuickActions = React.memo(() => {
  const actions = [
    {
      icon: Users,
      title: 'Trova Connessioni',
      description: 'Scopri nuovi professionisti',
      onClick: () => frontendLogger.componentLoad('Navigate to connections', undefined, { component: 'NetworkingQuickActions' })
    },
    {
      icon: MessageCircle,
      title: 'Messaggi',
      description: 'Gestisci conversazioni',
      onClick: () => frontendLogger.componentLoad('Navigate to messages', undefined, { component: 'NetworkingQuickActions' })
    },
    {
      icon: Calendar,
      title: 'Eventi Networking',
      description: 'Partecipa agli eventi',
      onClick: () => frontendLogger.componentLoad('Navigate to events', undefined, { component: 'NetworkingQuickActions' })
    }
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Azioni Rapide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <Button 
              key={index}
              className="flex items-center gap-2 h-auto p-4" 
              variant="outline"
              onClick={action.onClick}
            >
              <action.icon className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-sm text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

NetworkingQuickActions.displayName = 'NetworkingQuickActions';