
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, UserCheck, UserX } from "lucide-react";
import { UserActions } from "./UserActions";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_photo_url: string | null;
  profession: string | null;
  is_suspended: boolean;
}

interface UserCardProps {
  user: User;
  onActivateUser: (userId: string) => void;
  onDeactivateUser: (userId: string) => void;
  onPromoteToAdmin: (userId: string) => void;
  onDemoteFromAdmin: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onActivateUser,
  onDeactivateUser,
  onPromoteToAdmin,
  onDemoteFromAdmin
}) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={user.profile_photo_url || undefined} />
            <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{user.first_name} {user.last_name}</div>
            <div className="text-xs text-gray-500">{user.profession || 'No profession'}</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {user.role === 'admin' ? (
            <Badge variant="secondary">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          ) : (
            <Badge variant="outline">
              <UserCheck className="w-3 h-3 mr-1" />
              Coworker
            </Badge>
          )}
          
          {user.is_suspended && (
            <Badge variant="destructive">
              <UserX className="w-3 h-3 mr-1" />
              Sospeso
            </Badge>
          )}
        </div>
        
        <UserActions
          user={user}
          onActivateUser={onActivateUser}
          onDeactivateUser={onDeactivateUser}
          onPromoteToAdmin={onPromoteToAdmin}
          onDemoteFromAdmin={onDemoteFromAdmin}
        />
      </CardContent>
    </Card>
  );
};
