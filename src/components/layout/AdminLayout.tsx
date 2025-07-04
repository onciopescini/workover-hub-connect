import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { Button } from "@/components/ui/button";
import { Shield, Users, Building, Tags, Headphones, FileText, LogOut, Home, Flag, LayoutDashboard, Scale } from "lucide-react";
import { useLogger } from '@/hooks/useLogger';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

export const AdminLayout = ({ children, currentPage }: AdminLayoutProps) => {
  const { error } = useLogger({ context: 'AdminLayout' });
  const navigate = useNavigate();
  const { authState, signOut } = useAuth();

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

  const navItems = [
    { label: "Dashboard", path: "/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Utenti", path: "/admin/users", icon: <Users className="w-4 h-4" /> },
    { label: "Spazi", path: "/admin/spaces", icon: <Building className="w-4 h-4" /> },
    { label: "Tag", path: "/admin/tags", icon: <Tags className="w-4 h-4" /> },
    { label: "Segnalazioni", path: "/admin/reports", icon: <Flag className="w-4 h-4" /> },
    { label: "Supporto", path: "/admin/tickets", icon: <Headphones className="w-4 h-4" /> },
    { label: "GDPR & Compliance", path: "/admin/gdpr", icon: <Scale className="w-4 h-4" /> },
    { label: "Log", path: "/admin/logs", icon: <FileText className="w-4 h-4" /> },
  ];

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
              <div className="text-sm text-gray-600">
                Admin: {authState.profile?.first_name} {authState.profile?.last_name}
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
