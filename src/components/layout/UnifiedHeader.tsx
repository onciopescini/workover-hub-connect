
import React from 'react';
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
import { ChevronDown, Building2, User, LogOut } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

export function UnifiedHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authState, signOut } = useAuth();

  const isActivePath = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
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
    return "/spaces"; // Coworker ora va direttamente agli spazi
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
            <Button
              variant={isActivePath('/spaces') ? 'default' : 'ghost'}
              onClick={() => navigate('/spaces')}
              className={isActivePath('/spaces') ? 'bg-indigo-600 text-white' : ''}
            >
              Spazi
            </Button>
            
            <Button
              variant={isActivePath('/events') ? 'default' : 'ghost'}
              onClick={() => navigate('/events')}
              className={isActivePath('/events') ? 'bg-indigo-600 text-white' : ''}
            >
              Eventi
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  Altro <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/about')}>
                  Chi siamo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/faq')}>
                  FAQ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/terms')}>
                  Termini di servizio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/privacy')}>
                  Privacy Policy
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                      <DropdownMenuItem onClick={() => navigate(getDashboardUrl())}>
                        <Building2 className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Visualizza Profilo</span>
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
