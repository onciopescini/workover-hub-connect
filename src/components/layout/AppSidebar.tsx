import { useMemo, useCallback } from "react";
import {
  Home,
  Building2,
  Calendar,
  MessageSquare,
  Users,
  LayoutDashboard,
  Shield,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Sparkles,
  Settings,
  PlusCircle,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AppSidebar() {
  const { authState } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const { data: pendingSpacesCount } = useQuery({
    queryKey: ["admin-pending-spaces"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("spaces")
        .select("id", { count: "exact", head: true })
        .eq("pending_approval", true);
      if (error) throw error;
      return count || 0;
    },
    enabled: authState.roles.includes("admin"),
    staleTime: 60000,
  });

  const mainItems = useMemo(() => {
    const items = [
      { title: "Home", url: "/", icon: Home },
      {
        title: "Spazi",
        url: "/search",
        icon: Building2,
        badge:
          authState.roles.includes("admin") && pendingSpacesCount && pendingSpacesCount > 0
            ? pendingSpacesCount
            : undefined,
      },
      { title: "Prenotazioni", url: "/bookings", icon: Calendar },
      { title: "Messaggi", url: "/messages", icon: MessageSquare },
      { title: "Networking", url: "/networking", icon: Users },
    ];

    if (authState.roles.includes("admin")) {
      items.push({ title: "Admin Panel", url: "/admin/users", icon: Shield });
    }

    return items;
  }, [authState.roles, pendingSpacesCount]);

  const stripeOnboardingStatus = authState.profile?.stripe_onboarding_status;
  const isHostRestricted = stripeOnboardingStatus === "restricted";

  const hostItems = useMemo(() => {
    if (stripeOnboardingStatus === "completed" || stripeOnboardingStatus === "restricted") {
      return [
        { title: "Dashboard", url: "/host/dashboard", icon: LayoutDashboard },
        { title: "My Spaces", url: "/host/spaces", icon: Building2 },
        { title: "Crea Spazio", url: "/spaces/new", icon: PlusCircle, disabled: isHostRestricted },
        { title: "Bookings", url: "/bookings", icon: Calendar },
        { title: "Settings", url: "/settings", icon: Settings },
        { title: "Wallet", url: "/host/wallet", icon: Wallet },
      ];
    }

    return [{ title: "Diventa Host", url: "/host/become", icon: Sparkles }];
  }, [isHostRestricted, stripeOnboardingStatus]);

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") {
        return location.pathname === "/";
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname],
  );

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-3 py-4">
        <div className="flex items-center justify-center">
          {!isCollapsed ? (
            <span className="text-xl font-bold text-primary">Workover</span>
          ) : (
            <span className="text-xl font-bold text-primary">W</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
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

        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Host</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {hostItems.map((item) => {
                const Icon = item.icon;
                const restrictedCreateSpaceTooltip =
                  item.disabled === true
                    ? "Creazione spazio non disponibile: Stripe ha limitato il tuo account host."
                    : item.title;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.disabled}
                      isActive={item.disabled ? false : isActive(item.url)}
                      tooltip={restrictedCreateSpaceTooltip}
                      disabled={item.disabled}
                      title={item.disabled ? restrictedCreateSpaceTooltip : undefined}
                      className={item.disabled ? "opacity-50 cursor-not-allowed" : undefined}
                    >
                      {item.disabled ? (
                        <div className="flex items-center gap-2 w-full">
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </div>
                      ) : (
                        <NavLink to={item.url} className="flex items-center gap-2 w-full">
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <Button variant="ghost" size="sm" onClick={toggleSidebar} className="w-full justify-center">
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
