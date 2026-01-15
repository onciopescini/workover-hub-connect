
import React from 'react';
import { UserCard } from "./UserCard";
import { AdminUser } from '@/types/admin-user';

interface UserListProps {
  users: AdminUser[];
  onActivateUser: (userId: string) => void;
  onDeactivateUser: (userId: string) => void;
  onPromoteToAdmin: (userId: string) => void;
  onDemoteFromAdmin: (userId: string) => void;
  onBanUser?: (userId: string, reason: string) => void;
  onUnbanUser?: (userId: string) => void;
  onRefresh?: () => void;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  onActivateUser,
  onDeactivateUser,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  onBanUser,
  onUnbanUser,
  onRefresh
}) => {
  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nessun utente trovato
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onActivateUser={onActivateUser}
          onDeactivateUser={onDeactivateUser}
          onPromoteToAdmin={onPromoteToAdmin}
          onDemoteFromAdmin={onDemoteFromAdmin}
          onBanUser={onBanUser}
          onUnbanUser={onUnbanUser}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
};
