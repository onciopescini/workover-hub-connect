import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, UserX } from "lucide-react";
import { AccessDeniedProps } from "@/types/host/access.types";

export const AccessDenied = ({ 
  variant, 
  title, 
  message, 
  actionButton 
}: AccessDeniedProps) => {
  const getIcon = () => {
    switch (variant) {
      case 'unauthenticated':
        return <Lock className="w-12 h-12 text-amber-500 mx-auto mb-4" />;
      case 'unauthorized':
        return <UserX className="w-12 h-12 text-red-500 mx-auto mb-4" />;
      case 'suspended':
        return <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />;
    }
  };

  const getDefaultContent = () => {
    switch (variant) {
      case 'unauthenticated':
        return {
          title: title || 'Accesso Richiesto',
          message: message || 'Effettua il login per accedere a questa area.'
        };
      case 'unauthorized':
        return {
          title: title || 'Accesso Limitato',
          message: message || 'Non hai i permessi necessari per accedere a questa area.'
        };
      case 'suspended':
        return {
          title: title || 'Account Sospeso',
          message: message || 'Il tuo account è attualmente sospeso. Contatta il supporto per maggiori informazioni.'
        };
      default:
        return {
          title: title || 'Accesso Negato',
          message: message || 'Non puoi accedere a questa area.'
        };
    }
  };

  const content = getDefaultContent();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="p-8 text-center">
          {getIcon()}
          <h2 className="text-xl font-semibold mb-2">{content.title}</h2>
          <p className="text-muted-foreground mb-4">{content.message}</p>
          {actionButton && (
            <Button asChild>
              <a href={actionButton.href}>{actionButton.text}</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};