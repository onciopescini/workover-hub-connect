import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Building, Tags, Headphones, FileText, LogOut, Home, Flag, LayoutDashboard, Scale, Settings } from "lucide-react";
import { useLogger } from '@/hooks/useLogger';
import { useModeratorCheck } from '@/hooks/admin/useModeratorCheck';
import { canManageUsers, canManageSystemRoles, canManageSettings } from '@/lib/admin/moderator-permissions';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

export const AdminLayout = ({ children, currentPage }: AdminLayoutProps) => {
  const { error } = useLogger({ context: 'AdminLayout' });
  const navigate = useNavigate();
  const { authState, signOut } = useAuth();
  const { isAdmin, isModerator, canModerate, roles } = useModeratorCheck();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (logoutError) {
      error('Error signing out admin user', logoutError as Error, { 
        operation: 'admin_logout',
        adminId: authState.profile?.id,
        currentPage
      });
    }
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
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant={currentPage === item.path ? "default" : "ghost"}
                size="sm"
                className={`flex items-center gap-2 ${
                  currentPage === item.path ? "bg-indigo-600" : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
