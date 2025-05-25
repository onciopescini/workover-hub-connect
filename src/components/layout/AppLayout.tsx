
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Home, Settings, Users, Calendar, MessageSquare, CreditCard, BarChart3 } from "lucide-react";
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
  const { authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getDashboardUrl = () => {
    if (authState.profile?.role === "admin") return "/admin";
    if (authState.profile?.role === "host") return "/host/dashboard";
    return "/dashboard";
  };

  const getNavLinks = () => {
    const role = authState.profile?.role;
    const baseLinks = [
      { icon: Home, label: "Dashboard", href: getDashboardUrl() },
      { icon: Calendar, label: "Prenotazioni", href: "/bookings" },
      { icon: MessageSquare, label: "Messaggi", href: "/messages" },
    ];

    if (role === "host") {
      return [
        ...baseLinks,
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

    // Solo i coworker possono accedere al networking
    if (role === "coworker") {
      baseLinks.splice(3, 0, { icon: Users, label: "Networking", href: "/networking" });
    }

    return baseLinks;
  };

  const handleBackClick = () => {
    if (customBackUrl) {
      navigate(customBackUrl);
    } else {
      navigate(getDashboardUrl());
    }
  };

  const isCurrentPath = (href: string) => location.pathname === href;

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
              <span className="text-sm font-medium text-gray-700">
                {authState.profile?.first_name} {authState.profile?.last_name}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Quick Navigation Bar (Mobile-friendly) */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-2 overflow-x-auto">
            {getNavLinks().map((link) => {
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

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - Ora sempre visibile */}
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
                    {authState.profile?.first_name} {authState.profile?.last_name}
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
