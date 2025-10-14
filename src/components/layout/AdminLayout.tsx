import React, { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Building, Tags, Headphones, FileText, LogOut, Home, Flag, LayoutDashboard, Scale, Settings, Receipt } from "lucide-react";
import { useLogger } from '@/hooks/useLogger';
import { useModeratorCheck } from '@/hooks/admin/useModeratorCheck';
import { canManageUsers, canManageSystemRoles, canManageSettings } from '@/lib/admin/moderator-permissions';
import { queryKeys } from '@/lib/react-query-config';
import { useAdminPrefetch } from '@/hooks/admin/useAdminPrefetch';
import { useRealtimeAdminData } from '@/hooks/admin/useRealtimeAdminData';
import { supabase } from '@/integrations/supabase/client';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { pathname } = useLocation();
  const { error } = useLogger({ context: 'AdminLayout' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authState, signOut } = useAuth();
  const { isAdmin, isModerator, canModerate, roles } = useModeratorCheck();
  const { prefetchUsers, prefetchSpaces, prefetchReports, prefetchSettings } = useAdminPrefetch();
  const { pendingSpacesCount, openReportsCount } = useRealtimeAdminData();
  
  const userId = authState.user?.id;

  // Strategic prefetching on admin panel entry
  useEffect(() => {
    if (!userId) return;

    // Prefetch user roles (used in every admin check)
    queryClient.prefetchQuery({
      queryKey: queryKeys.admin.userRoles(userId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        if (error) throw error;
        return data.map(r => r.role);
      },
      staleTime: 5 * 60 * 1000, // 5 minuti
    });

    // Prefetch pending spaces count (for badge)
    queryClient.prefetchQuery({
      queryKey: queryKeys.admin.pendingSpacesCount(),
      queryFn: async () => {
        const { count, error } = await supabase
          .from('spaces')
          .select('*', { count: 'exact', head: true })
          .eq('pending_approval', true)
          .eq('published', false);
        if (error) throw error;
        return count || 0;
      },
      staleTime: 2 * 60 * 1000, // 2 minuti
    });

    // Prefetch open reports count
    queryClient.prefetchQuery({
      queryKey: queryKeys.admin.openReportsCount(),
      queryFn: async () => {
        const { count, error } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        if (error) throw error;
        return count || 0;
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [userId, queryClient]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (logoutError) {
      error('Error signing out admin user', logoutError as Error, { 
        operation: 'admin_logout',
        adminId: authState.profile?.id,
        currentPage: pathname
      });
    }
  };

  // Helper to check if a path is active
  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(path);
  };

  // Define all nav items with role requirements
  const allNavItems = [
    { label: "Dashboard", path: "/admin", icon: <LayoutDashboard className="w-4 h-4" />, roles: ['admin', 'moderator'] },
    { label: "Utenti", path: "/admin/users", icon: <Users className="w-4 h-4" />, roles: ['admin'] },
    { label: "Ruoli di Sistema", path: "/admin/system-roles", icon: <Shield className="w-4 h-4" />, roles: ['admin'] },
    { label: "Spazi", path: "/admin/spaces", icon: <Building className="w-4 h-4" />, roles: ['admin', 'moderator'] },
    { label: "Tag", path: "/admin/tags", icon: <Tags className="w-4 h-4" />, roles: ['admin', 'moderator'] },
    { label: "Segnalazioni", path: "/admin/reports", icon: <Flag className="w-4 h-4" />, roles: ['admin', 'moderator'] },
    { label: "Supporto", path: "/admin/tickets", icon: <Headphones className="w-4 h-4" />, roles: ['admin', 'moderator'] },
    { label: "GDPR & Compliance", path: "/admin/gdpr", icon: <Scale className="w-4 h-4" />, roles: ['admin'] },
    { label: "Gestione Fiscale", path: "/admin/fiscal", icon: <Receipt className="w-4 h-4" />, roles: ['admin'] },
    { label: "Impostazioni", path: "/admin/settings", icon: <Settings className="w-4 h-4" />, roles: ['admin'] },
    { label: "Log", path: "/admin/logs", icon: <FileText className="w-4 h-4" />, roles: ['admin', 'moderator'] },
  ];

  // Filter nav items based on user's roles
  const navItems = allNavItems.filter(item => {
    if (isAdmin) return true; // Admins see everything
    if (isModerator) return item.roles.includes('moderator');
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-red-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">
                Pannello Amministrazione
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {authState.profile?.first_name} {authState.profile?.last_name}
                </span>
                {isAdmin && (
                  <Badge variant="destructive" className="text-xs">
                    Admin
                  </Badge>
                )}
                {isModerator && !isAdmin && (
                  <Badge variant="default" className="text-xs bg-yellow-500 hover:bg-yellow-600">
                    Moderatore
                  </Badge>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation */}
        <div className="mb-6 bg-white p-2 rounded-lg border shadow-sm">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              // Setup hover prefetch based on route
              const getPrefetchHandler = () => {
                if (item.path === '/admin/users') return prefetchUsers;
                if (item.path === '/admin/spaces') return prefetchSpaces;
                if (item.path === '/admin/reports') return prefetchReports;
                if (item.path === '/admin/settings') return prefetchSettings;
                return undefined;
              };

              const prefetch = getPrefetchHandler();

              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  size="sm"
                  className={`flex items-center gap-2 ${
                    isActive(item.path) ? "bg-indigo-600" : ""
                  }`}
                  onMouseEnter={prefetch ? () => prefetch() : undefined}
                  onClick={() => navigate(item.path)}
                >
                  {item.icon}
                  {item.label}
                  {/* Show real-time counts as badges */}
                  {item.path === '/admin/spaces' && pendingSpacesCount !== undefined && pendingSpacesCount > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      {pendingSpacesCount}
                    </Badge>
                  )}
                  {item.path === '/admin/reports' && openReportsCount !== undefined && openReportsCount > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      {openReportsCount}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
