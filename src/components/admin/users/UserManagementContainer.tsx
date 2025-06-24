
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useUserFilters } from "@/hooks/useUserFilters";
import { useUserActions } from "@/hooks/useUserActions";
import { UserSearchAndFilters } from "./UserSearchAndFilters";
import { UserList } from "./UserList";

export const UserManagementContainer = () => {
  const { users, isLoading, updateUser } = useAdminUsers();
  const { 
    searchQuery, 
    setSearchQuery, 
    activeTab, 
    setActiveTab, 
    filteredUsers 
  } = useUserFilters(users);
  
  const {
    handleActivateUser,
    handleDeactivateUser,
    handlePromoteToAdmin,
    handleDemoteFromAdmin
  } = useUserActions(updateUser);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Caricamento utenti...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestione Utenti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <UserSearchAndFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        
        <UserList
          users={filteredUsers}
          onActivateUser={handleActivateUser}
          onDeactivateUser={handleDeactivateUser}
          onPromoteToAdmin={handlePromoteToAdmin}
          onDemoteFromAdmin={handleDemoteFromAdmin}
        />
      </CardContent>
    </Card>
  );
};
