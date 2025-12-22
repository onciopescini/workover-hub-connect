import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { Button } from '@/components/ui/button';
import { Menu, X, User, Settings, LogOut, Bell, MessageSquare, Calendar, MapPin, Users, Home, CheckCircle } from 'lucide-react';
import { useLogger } from '@/hooks/useLogger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationIcon } from '@/components/notifications/NotificationIcon';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { Badge } from '@/components/ui/badge';

export const OptimizedUnifiedHeader = () => {
  const { error } = useLogger({ context: 'OptimizedUnifiedHeader' });
  const { authState, signOut } = useAuth();
  const { isAdmin, isHost } = useRoleAccess();
  const { counts: unreadCounts } = useUnreadCount();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Memoized navigation items per evitare re-render eccessivi
  const navigationItems = useMemo(() => {
    if (!authState.isAuthenticated) {
      return [
        { name: 'Spazi', href: '/spaces', icon: MapPin },
        { name: 'Chi siamo', href: '/about', icon: Users },
        { name: 'FAQ', href: '/faq', icon: MessageSquare },
      ];
    }

    // Limbo user check: authenticated but no roles
    // We check roles directly from authState to avoid dependency issues
    if (!authState.roles || authState.roles.length === 0) {
      return []; // Hide all navigation for Limbo users
    }

    const baseItems = [
      { name: 'Spazi', href: '/spaces', icon: MapPin },
      { name: 'Networking', href: '/networking', icon: Users },
      { name: 'Prenotazioni', href: '/bookings', icon: Calendar },
      // "Messaggi" is now removed from here and moved to a standalone icon
    ];
    
    if (isHost) {
      return [
        ...baseItems,
        { name: 'Dashboard Host', href: '/host/dashboard', icon: Home },
      ];
    }
    
    if (isAdmin) {
      return [
        ...baseItems,
        { name: 'Admin Panel', href: '/admin/users', icon: Settings },
      ];
    }
    
    return baseItems;
  }, [authState.isAuthenticated, isAdmin, isHost, authState.roles]);

  // Memoized user initials
  const userInitials = useMemo(() => {
    const firstName = authState.profile?.first_name;
    const lastName = authState.profile?.last_name;

    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    // Fallback if profile is missing (Limbo user)
    if (authState.user?.email) {
      return authState.user.email.charAt(0).toUpperCase();
    }

    return 'U';
  }, [authState.profile?.first_name, authState.profile?.last_name, authState.user?.email]);

  // Display Name logic
  const displayName = useMemo(() => {
    if (authState.profile?.first_name) {
      return `${authState.profile.first_name} ${authState.profile.last_name || ''}`;
    }
    // Fallback: local part of email or 'Utente'
    return authState.user?.email?.split('@')[0] || 'Utente';
  }, [authState.profile, authState.user]);

  // Ottimizzata funzione isActivePath
  const isActivePath = useCallback((path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }, [location.pathname]);

  // Ottimizzato logo click handler
  const handleLogoClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Ottimizzato sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (signOutError) {
      error('Error during sign out from header', signOutError as Error, { 
        operation: 'header_sign_out',
        userId: authState.profile?.id,
        currentPath: location.pathname
      });
    }
  }, [signOut, error, authState.profile?.id, location.pathname]);

  // Ottimizzato mobile menu toggle
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Ottimizzato mobile menu close
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          {/* Logo - only visible on mobile when not authenticated */}
          {!authState.isAuthenticated && (
            <div className="flex items-center md:hidden">
              <button
                onClick={handleLogoClick}
                className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Workover
              </button>
            </div>
          )}
          
          {/* Desktop logo for non-authenticated users */}
          {!authState.isAuthenticated && (
            <div className="hidden md:flex items-center">
              <button
                onClick={handleLogoClick}
                className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Workover
              </button>
            </div>
          )}

          {/* Spacer for authenticated users */}
          {authState.isAuthenticated && <div className="flex-1" />}

          {/* Auth Section */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {authState.isAuthenticated ? (
              <>
                {authState.roles && authState.roles.length > 0 && (
                  <div className="flex items-center gap-1 md:gap-2">
                     {/* Messages Icon Button */}
                     <Button
                       variant="ghost"
                       size="icon"
                       className="relative"
                       asChild
                     >
                       <Link to="/messages" aria-label="Messaggi">
                         <MessageSquare className="w-5 h-5 text-gray-600" />
                         {unreadCounts.total > 0 && (
                           <Badge
                             variant="destructive"
                             className="absolute -top-1 -right-1 w-4 h-4 text-[10px] p-0 flex items-center justify-center rounded-full"
                           >
                             {unreadCounts.total > 99 ? '99+' : unreadCounts.total}
                           </Badge>
                         )}
                       </Link>
                     </Button>

                     {/* Notification Icon */}
                     <NotificationIcon />
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-1">
                       <Avatar className="h-8 w-8">
                         <AvatarImage 
                           src={authState.profile?.profile_photo_url ?? undefined}
                           alt={displayName}
                         />
                         <AvatarFallback>
                           {userInitials}
                         </AvatarFallback>
                       </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                       <Avatar className="h-8 w-8">
                         <AvatarImage 
                           src={authState.profile?.profile_photo_url ?? undefined}
                           alt={displayName}
                         />
                         <AvatarFallback>
                           {userInitials}
                         </AvatarFallback>
                       </Avatar>
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium text-sm">
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {authState.profile?.job_title || authState.user?.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {/* Show onboarding link if profile exists but incomplete, OR if no roles (Limbo) */}
                    {((authState.profile && !authState.profile.onboarding_completed) || (!authState.roles || authState.roles.length === 0)) && !isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/onboarding" className="flex items-center">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          <span>Completa onboarding</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center">
                        <Home className="mr-2 h-4 w-4" />
                        <span>Area Riservata</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Il mio profilo</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Impostazioni</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Esci</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link to="/login">Accedi</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Registrati</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? "Chiudi menu" : "Apri menu"}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                      isActivePath(item.href)
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              {/* Also add Messages here for mobile if not already covered, though standard nav usually handles main links.
                  Since we removed 'Messaggi' from navigationItems, let's explicitly add it for mobile if desired,
                  or rely on the top bar icon which is visible on mobile too.
                  Actually, typically top bar icons are the way to go for critical features like Messages on mobile.
              */}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
