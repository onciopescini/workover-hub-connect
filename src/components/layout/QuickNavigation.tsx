
import React from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Settings, Users, Calendar, MessageSquare, CreditCard, BarChart3 } from "lucide-react";

export function QuickNavigation() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const isCurrentPath = (href: string) => location.pathname === href;
  const navLinks = getNavLinks();

  if (navLinks.length === 0) {
    return null;
  }

  return (
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
  );
}
