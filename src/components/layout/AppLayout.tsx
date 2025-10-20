import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLogger } from "@/hooks/useLogger";
import { SuspensionBanner } from "@/components/ui/SuspensionBanner";
import { ArrowLeft, Home, Settings, Users, Calendar, MessageSquare, CreditCard, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { getPrimaryRole } from "@/lib/auth/role-utils";

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
  const primaryRole = getPrimaryRole(authState.roles);

  const getDashboardUrl = () => {
    if (primaryRole === "admin") return "/admin";
    if (primaryRole === "host") return "/host/dashboard";
    return "/spaces";
  };

  const getNavLinks = () => {
    if (primaryRole === "host") {
      return [
        { icon: Home, label: "Dashboard", href: "/host/dashboard" },
        { icon: Calendar, label: "Prenotazioni", href: "/bookings" },
        { icon: MessageSquare, label: "Messaggi", href: "/messages" },
        { icon: CreditCard, label: "Spazi", href: "/host/spaces" },
        { icon: Settings, label: "Host Dashboard", href: "/host/dashboard" },
      ];
    }

    if (primaryRole === "admin") {
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
        userRole: primaryRole,
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

  // Check if user is suspended
  const isSuspended = authState.profile?.suspended_at;
  
  // Don't show user menu for admin users
  const showUserMenu = primaryRole !== "admin";
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

          </div>
        </div>
      </nav>


      {/* Suspension Banner */}
      {isSuspended && authState.profile && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <SuspensionBanner 
              suspendedAt={authState.profile.suspended_at!}
              {...(authState.profile.suspension_reason && { reason: authState.profile.suspension_reason })}
            />
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
                {primaryRole === "coworker" && (
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
                    {primaryRole}
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
