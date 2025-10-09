import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminUserWithRoles, SystemRole } from "@/types/admin-user";
import { Shield, ShieldAlert, UserX } from "lucide-react";

interface SystemRolesTableProps {
  users: AdminUserWithRoles[];
  onPromoteToAdmin: (userId: string) => void;
  onDemoteFromAdmin?: (userId: string) => void;
  onPromoteToModerator: (userId: string) => void;
  onDemoteFromModerator?: (userId: string) => void;
  showOnlyPromote?: boolean;
}

export const SystemRolesTable: React.FC<SystemRolesTableProps> = ({
  users,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  onPromoteToModerator,
  onDemoteFromModerator,
  showOnlyPromote = false
}) => {
  const hasRole = (user: AdminUserWithRoles, role: SystemRole) => {
    return user.system_roles?.some(r => r.role === role) || false;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utente</TableHead>
          <TableHead>Ruolo Business</TableHead>
          <TableHead>Ruoli Sistema</TableHead>
          <TableHead>Azioni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const isAdmin = hasRole(user, 'admin');
          const isModerator = hasRole(user, 'moderator');

          return (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {user.first_name} {user.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.profession || 'N/A'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{user.role}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {isAdmin && (
                    <Badge variant="destructive">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {isModerator && (
                    <Badge variant="secondary">
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      Moderator
                    </Badge>
                  )}
                  {!isAdmin && !isModerator && (
                    <Badge variant="outline">Nessuno</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {/* Admin Actions */}
                  {isAdmin && !showOnlyPromote && onDemoteFromAdmin ? (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => onDemoteFromAdmin(user.id)}
                    >
                      <UserX className="h-3 w-3 mr-1" />
                      Rimuovi Admin
                    </Button>
                  ) : !isAdmin ? (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => onPromoteToAdmin(user.id)}
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      Promuovi Admin
                    </Button>
                  ) : null}

                  {/* Moderator Actions */}
                  {isModerator && !showOnlyPromote && onDemoteFromModerator ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onDemoteFromModerator(user.id)}
                    >
                      <UserX className="h-3 w-3 mr-1" />
                      Rimuovi Moderator
                    </Button>
                  ) : !isModerator && !isAdmin ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onPromoteToModerator(user.id)}
                    >
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      Promuovi Moderator
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
