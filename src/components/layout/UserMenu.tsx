
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function UserMenu() {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleViewProfile = () => {
    navigate("/profile");
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

  // Don't show user menu for admin users
  const showUserMenu = authState.profile?.role !== "admin";

  return (
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
  );
}
