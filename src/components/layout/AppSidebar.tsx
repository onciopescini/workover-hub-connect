import { Home, Building2, Calendar, MessageSquare, Users, LayoutDashboard, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { hasAnyRole } from "@/lib/auth/role-utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { authState } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const { data: pendingSpacesCount } = useQuery({
    queryKey: ['admin-pending-spaces'],
    queryFn: async () => {
       const { count, error } = await supabase
         .from("workspaces")
         .select("id", { count: "exact", head: true })
         .eq("pending_approval", true);
       if (error) throw error;
       return count || 0;
    },
    enabled: authState.roles.includes('admin'),
    staleTime: 60000,
  });

  const baseItems = [
    { title: "Home", url: "/", icon: Home },
    {
      title: "Spazi",
      url: "/spaces",
      icon: Building2,
      badge: (authState.roles.includes('admin') && pendingSpacesCount && pendingSpacesCount > 0) ? pendingSpacesCount : undefined
    },
    { title: "Prenotazioni", url: "/bookings", icon: Calendar },
    { title: "Messaggi", url: "/messages", icon: MessageSquare },
    { title: "Networking", url: "/networking", icon: Users },
  ];

  const roleItems = [];
  
  if (hasAnyRole(authState.roles, ['host', 'admin'])) {
    roleItems.push({ title: "Dashboard Host", url: "/host/dashboard", icon: LayoutDashboard });
  }
  
  if (authState.roles.includes('admin')) {
    roleItems.push({ title: "Admin Panel", url: "/admin/users", icon: Shield });
  }

  const allItems = [...baseItems, ...roleItems];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Header with logo */}
      <SidebarHeader className="border-b px-3 py-4">
        <div className="flex items-center justify-center">
          {!isCollapsed ? (
            <span className="text-xl font-bold text-primary">Workover</span>
          ) : (
            <span className="text-xl font-bold text-primary">W</span>
          )}
        </div>
      </SidebarHeader>

      {/* Main navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url} className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center ml-auto">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with toggle button */}
      <SidebarFooter className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full justify-center"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Comprimi</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
