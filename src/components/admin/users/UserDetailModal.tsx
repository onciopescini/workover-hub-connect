import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUser } from '@/types/admin-user';
import { UserWarningsPanel } from "./UserWarningsPanel";
import { UserNotesPanel } from "./UserNotesPanel";
import { UserBookingsHistory } from "./UserBookingsHistory";
import { UserRoleManager } from "./UserRoleManager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCheck, UserX, Mail, Phone, MapPin, Briefcase } from "lucide-react";

interface UserDetailModalProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdate: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  open,
  onOpenChange,
  onUserUpdate
}) => {
  if (!user) return null;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.profile_photo_url || undefined} />
              <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-2xl">
                {user.first_name} {user.last_name}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap gap-2 mt-2">
                {user.role === 'admin' ? (
                  <Badge variant="secondary">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <UserCheck className="w-3 h-3 mr-1" />
                    {user.role === 'host' ? 'Host' : 'Coworker'}
                  </Badge>
                )}
                
                {user.is_suspended && (
                  <Badge variant="destructive">
                    <UserX className="w-3 h-3 mr-1" />
                    Sospeso
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* User Info Cards */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {user.profession && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{user.profession}</span>
            </div>
          )}
          {user.city && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{user.city}</span>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{user.phone}</span>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
            <TabsTrigger value="notes">Note Admin</TabsTrigger>
            <TabsTrigger value="roles">Ruoli</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Informazioni Account</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Registrato:</span>
                  <span className="ml-2">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ultimo accesso:</span>
                  <span className="ml-2">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Mai'}
                  </span>
                </div>
              </div>
            </div>

            {user.competencies && user.competencies.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Competenze</h3>
                <div className="flex flex-wrap gap-2">
                  {user.competencies.map((comp, idx) => (
                    <Badge key={idx} variant="outline">{comp}</Badge>
                  ))}
                </div>
              </div>
            )}

            {user.industries && user.industries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Settori</h3>
                <div className="flex flex-wrap gap-2">
                  {user.industries.map((ind, idx) => (
                    <Badge key={idx} variant="outline">{ind}</Badge>
                  ))}
                </div>
              </div>
            )}

            {user.is_suspended && user.suspension_reason && (
              <div className="space-y-2 p-4 bg-destructive/10 rounded-md">
                <h3 className="text-sm font-medium text-destructive">Motivo Sospensione</h3>
                <p className="text-sm">{user.suspension_reason}</p>
              </div>
            )}

            <UserBookingsHistory userId={user.id} />
          </TabsContent>

          <TabsContent value="warnings">
            <UserWarningsPanel userId={user.id} onWarningCreated={onUserUpdate} />
          </TabsContent>

          <TabsContent value="notes">
            <UserNotesPanel userId={user.id} onNotesUpdated={onUserUpdate} />
          </TabsContent>

          <TabsContent value="roles">
            <UserRoleManager userId={user.id} onRoleChanged={onUserUpdate} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
