
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, Lock, User, MapPin, Calendar, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileAccessResult } from "@/lib/profile-access-utils";

interface ProfileAccessDeniedProps {
  accessResult: ProfileAccessResult;
  profileName?: string;
}

export const ProfileAccessDenied = ({ accessResult, profileName }: ProfileAccessDeniedProps) => {
  const navigate = useNavigate();

  const getAccessDeniedContent = () => {
    switch (accessResult.access_reason) {
      case 'networking_disabled':
        return {
          icon: <UserX className="h-16 w-16 text-gray-400" />,
          title: "Profilo Privato",
          description: "Questo utente ha disabilitato il networking e il suo profilo non è accessibile.",
          suggestion: null,
          actionText: null,
          action: null
        };
      case 'no_shared_context':
        return {
          icon: <Lock className="h-16 w-16 text-gray-400" />,
          title: "Accesso Limitato",
          description: `Non hai una connessione o contesto condiviso con ${profileName || 'questo utente'} per visualizzare il profilo completo.`,
          suggestion: "Partecipa agli stessi spazi o eventi per sbloccare l'accesso al profilo.",
          actionText: "Esplora Spazi",
          action: () => navigate('/spaces')
        };
      case 'user_not_found':
        return {
          icon: <User className="h-16 w-16 text-gray-400" />,
          title: "Utente Non Trovato",
          description: "L'utente che stai cercando non esiste o non è più disponibile.",
          suggestion: "Verifica il link o torna alla pagina principale.",
          actionText: "Torna alla Home",
          action: () => navigate('/')
        };
      default:
        return {
          icon: <Lock className="h-16 w-16 text-gray-400" />,
          title: "Accesso Negato",
          description: accessResult.message || "Non hai i permessi per visualizzare questo profilo.",
          suggestion: "Prova a connetterti con questo utente per ottenere l'accesso.",
          actionText: "Vai al Networking",
          action: () => navigate('/networking')
        };
    }
  };

  const content = getAccessDeniedContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {content.icon}
          <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">
            {content.title}
          </h3>
          <p className="text-gray-600 mb-4">
            {content.description}
          </p>
          
          {content.suggestion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <Heart className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">{content.suggestion}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {content.action && content.actionText && (
              <Button onClick={content.action} className="w-full">
                {content.actionText}
              </Button>
            )}
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/spaces')}
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Spazi
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/events')}
                className="flex-1"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Eventi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
