import React from 'react';
import { ConversationType } from '@/types/chat';
import { Briefcase, Users, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationTypeBadgeProps {
  type: ConversationType;
  className?: string;
}

export const ConversationTypeBadge: React.FC<ConversationTypeBadgeProps> = ({ 
  type, 
  className 
}) => {
  const config = {
    booking: {
      icon: Briefcase,
      label: 'Prenotazione',
      bgClass: 'bg-primary/10 text-primary',
    },
    private: {
      icon: MessageCircle,
      label: 'Messaggio',
      bgClass: 'bg-muted text-muted-foreground',
    },
    networking: {
      icon: Users,
      label: 'Networking',
      bgClass: 'bg-accent text-accent-foreground',
    },
  };

  const { icon: Icon, label, bgClass } = config[type] || config.private;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
        bgClass,
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      <span>{label}</span>
    </div>
  );
};
