
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Eye, EyeOff, Users, CheckCircle } from "lucide-react";

interface ProfileAccessBadgeProps {
  accessReason: string;
  visibilityLevel: 'full' | 'limited' | 'none';
  className?: string;
}

export const ProfileAccessBadge = ({ accessReason, visibilityLevel, className }: ProfileAccessBadgeProps) => {
  const getBadgeContent = () => {
    switch (accessReason) {
      case 'own_profile':
        return {
          icon: <Eye className="w-3 h-3" />,
          text: 'Il tuo profilo',
          variant: 'default' as const,
          tooltip: 'Hai accesso completo al tuo profilo'
        };
      case 'accepted_connection':
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          text: 'Connesso',
          variant: 'default' as const,
          tooltip: 'Accesso completo tramite connessione accettata'
        };
      case 'mutual_suggestion':
        return {
          icon: <Users className="w-3 h-3" />,
          text: 'Contesto condiviso',
          variant: 'secondary' as const,
          tooltip: 'Accesso completo tramite spazi/eventi condivisi'
        };
      case 'suggestion_exists':
        return {
          icon: <EyeOff className="w-3 h-3" />,
          text: 'Accesso limitato',
          variant: 'outline' as const,
          tooltip: 'Visualizzazione limitata - partecipate agli stessi contesti'
        };
      default:
        return {
          icon: <Lock className="w-3 h-3" />,
          text: 'Accesso negato',
          variant: 'destructive' as const,
          tooltip: 'Nessun accesso al profilo'
        };
    }
  };

  const content = getBadgeContent();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={content.variant} className={`flex items-center space-x-1 ${className}`}>
            {content.icon}
            <span>{content.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{content.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
