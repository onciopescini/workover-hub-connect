
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "./UserMenu";

interface AppNavbarProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  customBackUrl?: string;
}

export function AppNavbar({ 
  title, 
  subtitle, 
  showBackButton = true, 
  customBackUrl 
}: AppNavbarProps) {
  const { authState } = useAuth();
  const navigate = useNavigate();

  const getDashboardUrl = () => {
    if (authState.profile?.role === "admin") return "/admin";
    if (authState.profile?.role === "host") return "/host/dashboard";
    return "/spaces";
  };

  const handleBackClick = () => {
    if (customBackUrl) {
      navigate(customBackUrl);
    } else {
      navigate(getDashboardUrl());
    }
  };

  return (
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
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
