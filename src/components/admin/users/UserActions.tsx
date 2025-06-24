
import React from 'react';
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  role: string;
  is_suspended: boolean;
}

interface UserActionsProps {
  user: User;
  onActivateUser: (userId: string) => void;
  onDeactivateUser: (userId: string) => void;
  onPromoteToAdmin: (userId: string) => void;
  onDemoteFromAdmin: (userId: string) => void;
}

export const UserActions: React.FC<UserActionsProps> = ({
  user,
  onActivateUser,
  onDeactivateUser,
  onPromoteToAdmin,
  onDemoteFromAdmin
}) => {
  return (
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
  );
};
