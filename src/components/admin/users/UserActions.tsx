
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AdminUser } from '@/types/admin-user';
import { BanUserDialog } from './BanUserDialog';

interface UserActionsProps {
  user: AdminUser;
  onActivateUser: (userId: string) => void;
  onDeactivateUser: (userId: string) => void;
  onPromoteToAdmin: (userId: string) => void;
  onDemoteFromAdmin: (userId: string) => void;
  onBanUser: (userId: string, reason: string) => void;
  onUnbanUser: (userId: string) => void;
}

export const UserActions: React.FC<UserActionsProps> = ({
  user,
  onActivateUser,
  onDeactivateUser,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  onBanUser,
  onUnbanUser
}) => {
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);

  return (
    <>
      <div className="flex space-x-2">
        {user.is_suspended ? (
          <Button size="sm" onClick={() => onActivateUser(user.id)}>
            Attiva
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onDeactivateUser(user.id)}>
            Sospendi
          </Button>
        )}

        {user.banned_at ? (
          <Button variant="outline" size="sm" onClick={() => onUnbanUser(user.id)}>
            Sbanna
          </Button>
        ) : (
          <Button variant="destructive" size="sm" onClick={() => setIsBanDialogOpen(true)}>
            Banna
          </Button>
        )}

        {user.role === 'admin' ? (
          <Button variant="ghost" size="sm" onClick={() => onDemoteFromAdmin(user.id)}>
            Demansiona
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => onPromoteToAdmin(user.id)}>
            Promuovi
          </Button>
        )}
      </div>

      <BanUserDialog
        isOpen={isBanDialogOpen}
        onClose={() => setIsBanDialogOpen(false)}
        onConfirm={(reason) => onBanUser(user.id, reason)}
        userName={`${user.first_name} ${user.last_name}`}
      />
    </>
  );
};
