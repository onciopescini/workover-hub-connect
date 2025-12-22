
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, UserCheck, UserX, Home } from "lucide-react";
import { UserActions } from "./UserActions";
import { UserDetailModal } from "./UserDetailModal";
import { AdminUser } from '@/types/admin-user';

interface UserCardProps {
  user: AdminUser;
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
  const [showDetail, setShowDetail] = React.useState(false);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent opening modal when clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setShowDetail(true);
  };

  const renderRoleBadge = () => {
    if (user.role === 'admin') {
      return (
        <Badge variant="secondary">
          <Shield className="w-3 h-3 mr-1" />
          Admin
        </Badge>
      );
    }

    if (user.role === 'host') {
      return (
        <Badge variant="default">
          <Home className="w-3 h-3 mr-1" />
          Host
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        <UserCheck className="w-3 h-3 mr-1" />
        Coworker
      </Badge>
    );
  };

  return (
    <>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
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
          {renderRoleBadge()}
          
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

    <UserDetailModal 
      user={user}
      open={showDetail}
      onOpenChange={setShowDetail}
      onUserUpdate={() => {}}
    />
    </>
  );
};
