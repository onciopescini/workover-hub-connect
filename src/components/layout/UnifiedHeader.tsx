
import React, { useEffect } from 'react';
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
import { ChevronDown, Building2, User, LogOut, Calendar, MessageSquare, Users } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

export function UnifiedHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authState, signOut, refreshProfile } = useAuth();

  // Refresh profile when header mounts or location changes
  useEffect(() => {
    if (authState.isAuthenticated && authState.user && refreshProfile) {
      refreshProfile();
    }
  }, [authState.isAuthenticated, authState.user, location.pathname, refreshProfile]);

  const isActivePath = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const getUserInitials = () => {
    const firstName = authState.profile?.first_name || "";
    const lastName = authState.profile?.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const getUserFullName = () => {
    const firstName = authState.profile?.first_name || "";
    const lastName = authState.profile?.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Utente";
  };

  const getDashboardUrl = () => {
    if (authState.profile?.role === "admin") return "/admin";
    if (authState.profile?.role === "host") return "/host/dashboard";
    return "/app/spaces"; // Coworker ora va agli spazi autenticati
  };

  const getMainNavItems = () => {
    const baseItems = [
      { path: '/app/spaces', label: 'Spazi', icon: Building2 },
      { path: '/app/events', label: 'Eventi', icon: Calendar },
    ];

    // Add coworker-specific navigation items when authenticated
    if (authState.isAuthenticated && authState.profile?.role === "coworker") {
      return [
        ...baseItems,
        { path: '/bookings', label: 'Prenotazioni', icon: Calendar },
        { path: '/messages', label: 'Messaggi', icon: MessageSquare },
        { path: '/networking', label: 'Networking', icon: Users },
      ];
    }

    return baseItems;
  };

  const handleNavigation = async (path: string) => {
    // Refresh profile before navigation to ensure consistent state
    if (authState.isAuthenticated && refreshProfile) {
      await refreshProfile();
    }
    navigate(path);
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Workover</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {getMainNavItems().map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={isActivePath(item.path) ? 'default' : 'ghost'}
                  onClick={() => handleNavigation(item.path)}
                  className={`flex items-center gap-2 ${
                    isActivePath(item.path) ? 'bg-indigo-600 text-white' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
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
                  onClick={() => navigate('/login')}
                  className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                >
                  Accedi
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Registrati
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={authState.profile?.profile_photo_url || ""} />
                      <AvatarFallback className="text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700 hidden md:inline">
                      {getUserFullName()}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{getUserFullName()}</p>
                    <p className="text-xs text-gray-500">{authState.user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  
                  {/* Role-specific navigation */}
                  {(authState.profile?.role === "host" || authState.profile?.role === "admin") && (
                    <>
                      <DropdownMenuItem onClick={() => handleNavigation(getDashboardUrl())}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem onClick={() => handleNavigation('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Visualizza Profilo</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Informational pages moved from "Altro" section */}
                  <DropdownMenuItem onClick={() => handleNavigation('/about')}>
                    <span>Chi siamo</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/faq')}>
                    <span>FAQ</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/terms')}>
                    <span>Termini di servizio</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/privacy')}>
                    <span>Privacy Policy</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
