
import React, { useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Building2, User, LogOut, Calendar, MessageSquare, Users, Settings, Bell } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { NotificationIcon } from "@/components/notifications/NotificationIcon";

export function UnifiedHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authState, signOut } = useAuth();

  const isActivePath = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const getUserInitials = useMemo(() => {
    const firstName = authState.profile?.first_name || "";
    const lastName = authState.profile?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  }, [authState.profile?.first_name, authState.profile?.last_name]);

  const getUserFullName = useMemo(() => {
    const firstName = authState.profile?.first_name || "";
    const lastName = authState.profile?.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Utente";
  }, [authState.profile?.first_name, authState.profile?.last_name]);

  const getDashboardUrl = useCallback(() => {
    if (authState.profile?.role === "admin") return "/dashboard";
    if (authState.profile?.role === "host") return "/dashboard";
    return "/dashboard";
  }, [authState.profile?.role]);

  // Role-specific navigation items
  const getMainNavItems = useMemo(() => {
    if (!authState.isAuthenticated) {
      return [
        { path: '/spaces', label: 'Spazi', icon: Building2 },
        { path: '/events', label: 'Eventi', icon: Calendar },
      ];
    }

    const role = authState.profile?.role;

    if (role === "admin") {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Settings },
        { path: '/spaces', label: 'Spazi', icon: Building2 },
        { path: '/events', label: 'Eventi', icon: Calendar },
        { path: '/admin/users', label: 'Utenti', icon: Users },
        { path: '/validation', label: 'Validazione', icon: Settings },
      ];
    }

    if (role === "host") {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: Building2 },
        { path: '/spaces', label: 'Spazi', icon: Building2 },
        { path: '/events', label: 'Eventi', icon: Calendar },
        { path: '/bookings', label: 'Prenotazioni', icon: Calendar },
        { path: '/messages', label: 'Messaggi', icon: MessageSquare },
        { path: '/networking', label: 'Networking', icon: Users },
        { path: '/manage-space', label: 'Gestisci Spazi', icon: Settings },
      ];
    }

    // Coworker navigation
    return [
      { path: '/dashboard', label: 'Dashboard', icon: Building2 },
      { path: '/spaces', label: 'Spazi', icon: Building2 },
      { path: '/events', label: 'Eventi', icon: Calendar },
      { path: '/bookings', label: 'Prenotazioni', icon: Calendar },
      { path: '/messages', label: 'Messaggi', icon: MessageSquare },
      { path: '/networking', label: 'Networking', icon: Users },
    ];
  }, [authState.isAuthenticated, authState.profile?.role]);

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate(authState.isAuthenticated ? '/dashboard' : '/')}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Workover</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {getMainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={isActivePath(item.path) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleNavigation(item.path)}
                  className={`flex items-center gap-1 text-sm ${
                    isActivePath(item.path) ? 'bg-indigo-600 text-white' : ''
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* Auth section */}
          <div className="flex items-center space-x-4">
            {!authState.isAuthenticated ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                >
                  Accedi
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Registrati
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                {/* Notifications Icon - Only for authenticated users */}
                <NotificationIcon />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={authState.profile?.profile_photo_url || ""} />
                        <AvatarFallback className="text-xs">
                          {getUserInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-700 hidden md:inline">
                        {getUserFullName}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{getUserFullName}</p>
                      <p className="text-xs text-gray-500">{authState.user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => handleNavigation(getDashboardUrl())}>
                      <Building2 className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => handleNavigation('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Visualizza Profilo</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handleNavigation('/notifications')}>
                      <Bell className="mr-2 h-4 w-4" />
                      <span>Notifiche</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
