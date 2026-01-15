
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useUserActions } from "@/hooks/useUserActions";
import { UserSearchAndFilters } from "./UserSearchAndFilters";
import { UserList } from "./UserList";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const UserManagementContainer = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeTab]);

  const { users, totalCount, isLoading, updateUser, fetchUsers } = useAdminUsers({
    page,
    pageSize,
    search: searchQuery,
    activeTab
  });
  
  const {
    handleActivateUser,
    handleDeactivateUser,
    handlePromoteToAdmin,
    handleDemoteFromAdmin,
    handleBanUser,
    handleUnbanUser
  } = useUserActions(updateUser);

  const totalPages = Math.ceil(totalCount / pageSize);

  // We don't render loading state here fully because we want to keep filters visible
  // But initial load might need it. We will let the list handle empty/loading states if needed
  // or just show a spinner overlay.

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
        
        {isLoading && users.length === 0 ? (
           <div className="text-center py-8">Caricamento utenti...</div>
        ) : (
          <>
            <UserList
              users={users}
              onActivateUser={handleActivateUser}
              onDeactivateUser={handleDeactivateUser}
              onPromoteToAdmin={handlePromoteToAdmin}
              onDemoteFromAdmin={handleDemoteFromAdmin}
              onBanUser={handleBanUser}
              onUnbanUser={handleUnbanUser}
              onRefresh={fetchUsers}
            />

            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(p => p - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" onClick={(e) => e.preventDefault()} isActive>
                    {page} di {Math.max(1, totalPages)}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(p => p + 1);
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </>
        )}
      </CardContent>
    </Card>
  );
};
