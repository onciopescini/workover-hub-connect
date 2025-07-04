import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLogger } from "@/hooks/useLogger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Home, Settings, Users, Calendar, MessageSquare, CreditCard, BarChart3, User, LogOut, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  customBackUrl?: string;
}

export function AppLayout({ 
  children, 
  title, 
  subtitle, 
  showBackButton = true, 
  customBackUrl 
}: AppLayoutProps) {
  const { error } = useLogger({ context: 'AppLayout' });
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getDashboardUrl = () => {
    if (authState.profile?.role === "admin") return "/admin";
    if (authState.profile?.role === "host") return "/host/dashboard";
    return "/spaces";
  };

  const getNavLinks = () => {
    const role = authState.profile?.role;

    if (role === "host") {
      return [
        { icon: Home, label: "Dashboard", href: "/host/dashboard" },
        { icon: Calendar, label: "Prenotazioni", href: "/bookings" },
        { icon: MessageSquare, label: "Messaggi", href: "/messages" },
        { icon: CreditCard, label: "Spazi", href: "/spaces/manage" },
        { icon: Settings, label: "Host Dashboard", href: "/host/dashboard" },
      ];
    }

    if (role === "admin") {
      return [
        { icon: BarChart3, label: "Admin Panel", href: "/admin" },
        { icon: Users, label: "Utenti", href: "/admin" },
        { icon: Settings, label: "Impostazioni", href: "/admin" },
      ];
    }

    // For coworkers, don't show navigation here as it's now in the main header
    return [];
  };

  const handleBackClick = () => {
    if (customBackUrl) {
      navigate(customBackUrl);
    } else {
      navigate(getDashboardUrl());
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (logoutError) {
      error('Error during user logout', logoutError as Error, { 
        operation: 'user_logout',
        userId: authState.profile?.id,
        userRole: authState.profile?.role,
        currentPath: location.pathname
      });
    }
  };

  const handleViewProfile = () => {
    navigate("/profile");
  };

  const isCurrentPath = (href: string) => location.pathname === href;

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

  // Don't show user menu for admin users
  const showUserMenu = authState.profile?.role !== "admin";
  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackClick}
                  className="flex items-center gap-2"
                  aria-label="Torna alla dashboard"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              )}
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {title || "Workover"}
                </h1>
                {subtitle && (
                  <p className="text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Right side - User info */}
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {authState.profile?.role === "host" ? "Host" : 
                 authState.profile?.role === "admin" ? "Admin" : "Coworker"}
              </Badge>
              
              {showUserMenu ? (
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
                    <DropdownMenuItem onClick={handleViewProfile}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Visualizza Profilo</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-sm font-medium text-gray-700">
                  {getUserFullName()}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Quick Navigation Bar (Only for hosts and admins) */}
      {navLinks.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 py-2 overflow-x-auto">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = isCurrentPath(link.href);
                
                return (
                  <Button
                    key={link.href}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(link.href)}
                    className={`flex items-center gap-2 whitespace-nowrap ${
                      isActive ? "bg-[#4F46E5] text-white" : ""
                    }`}
                    aria-label={link.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{link.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - Always visible */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Workover</h3>
              <p className="text-xs text-gray-600">
                La piattaforma per coworking e networking professionale
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Link Utili</h4>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => navigate("/support")}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    Supporto
                  </button>
                </li>
                {authState.profile?.role === "coworker" && (
                  <li>
                    <button 
                      onClick={() => navigate("/networking")}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      Networking
                    </button>
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Account</h4>
              <ul className="space-y-1">
                <li>
                  <span className="text-xs text-gray-600">
                    {getUserFullName()}
                  </span>
                </li>
                <li>
                  <Badge variant="outline" className="text-xs">
                    {authState.profile?.role}
                  </Badge>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-4 mt-6">
            <p className="text-xs text-gray-500 text-center">
              © {new Date().getFullYear()} Workover. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
