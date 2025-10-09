import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, UserCog } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useUserActions } from "@/hooks/useUserActions";
import { SystemRolesTable } from "@/components/admin/roles/SystemRolesTable";
import { AdminUserWithRoles } from "@/types/admin-user";

const SystemRoles = () => {
  const { users, isLoading, updateUser } = useAdminUsers();
  const {
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handlePromoteToModerator,
    handleDemoteFromModerator
  } = useUserActions(updateUser);

  // Filtra solo utenti con ruoli di sistema
  const usersWithSystemRoles = users.filter((u: AdminUserWithRoles) => 
    u.system_roles && u.system_roles.length > 0
  );

  // Filtra utenti senza ruoli di sistema
  const usersWithoutSystemRoles = users.filter((u: AdminUserWithRoles) => 
    !u.system_roles || u.system_roles.length === 0
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Caricamento ruoli di sistema...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sezione: Utenti con Ruoli di Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Utenti con Ruoli di Sistema
          </CardTitle>
          <CardDescription>
            Gestisci admin e moderator esistenti
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersWithSystemRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun utente con ruoli di sistema
            </div>
          ) : (
            <SystemRolesTable
              users={usersWithSystemRoles}
              onPromoteToAdmin={handlePromoteToAdmin}
              onDemoteFromAdmin={handleDemoteFromAdmin}
              onPromoteToModerator={handlePromoteToModerator}
              onDemoteFromModerator={handleDemoteFromModerator}
              showOnlyPromote={false}
            />
          )}
        </CardContent>
      </Card>

      {/* Sezione: Assegna Nuovi Ruoli */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Assegna Nuovi Ruoli
          </CardTitle>
          <CardDescription>
            Promuovi utenti esistenti ad admin o moderator
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersWithoutSystemRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tutti gli utenti hanno già ruoli di sistema
            </div>
          ) : (
            <SystemRolesTable
              users={usersWithoutSystemRoles}
              onPromoteToAdmin={handlePromoteToAdmin}
              onPromoteToModerator={handlePromoteToModerator}
              showOnlyPromote={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemRoles;
