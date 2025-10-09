import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye } from "lucide-react";
import { useUserActions } from "@/hooks/useUserActions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserRoleManagerProps {
  userId: string;
  onRoleChanged: () => void;
}

export const UserRoleManager: React.FC<UserRoleManagerProps> = ({
  userId,
  onRoleChanged
}) => {
  const {
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handlePromoteToModerator,
    handleDemoteFromModerator
  } = useUserActions(onRoleChanged);

  const { data: userRoles, isLoading, refetch } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      // Check admin status only (moderator detection will come from profile or another source)
      const adminCheck = await supabase.rpc('is_admin', { user_id: userId });

      const roles: Array<{ role: string }> = [];
      if (adminCheck.data) {
        roles.push({ role: 'admin' });
      }
      
      return roles;
    }
  });

  const hasRole = (role: string) => {
    return userRoles?.some((r: any) => r.role === role) || false;
  };

  const handleRoleAction = async (action: () => Promise<void>) => {
    await action();
    refetch();
    onRoleChanged();
  };

  if (isLoading) {
    return <div className="text-center py-4">Caricamento ruoli...</div>;
  }

  const isAdmin = hasRole('admin');
  const isModerator = hasRole('moderator');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Ruolo Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAdmin ? (
            <>
              <Badge variant="secondary" className="mb-2">
                <Shield className="h-3 w-3 mr-1" />
                Admin Attivo
              </Badge>
              <p className="text-sm text-muted-foreground">
                L'utente ha accesso completo al pannello amministrativo e può gestire tutti gli aspetti della piattaforma.
              </p>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleRoleAction(() => handleDemoteFromAdmin(userId))}
              >
                Rimuovi Ruolo Admin
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                L'utente non ha il ruolo di amministratore.
              </p>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleRoleAction(() => handlePromoteToAdmin(userId))}
              >
                Promuovi ad Admin
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Ruolo Moderatore
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isModerator ? (
            <>
              <Badge variant="secondary" className="mb-2">
                <Eye className="h-3 w-3 mr-1" />
                Moderatore Attivo
              </Badge>
              <p className="text-sm text-muted-foreground">
                L'utente può moderare contenuti, gestire segnalazioni e approvare spazi.
              </p>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleRoleAction(() => handleDemoteFromModerator(userId))}
              >
                Rimuovi Ruolo Moderatore
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                L'utente non ha il ruolo di moderatore.
              </p>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleRoleAction(() => handlePromoteToModerator(userId))}
              >
                Promuovi a Moderatore
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
