import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Menu, 
  User, 
  LogOut, 
  Settings, 
  MapPin, 
  Calendar,
  MessageCircle,
  Users,
  CreditCard,
  Building,
  Plus,
  BarChart3,
  Shield,
  Home
} from 'lucide-react';
import { NotificationIcon } from '@/components/notifications/NotificationIcon';
import { GeographicSearch } from '@/components/shared/GeographicSearch';

export function UnifiedHeader() {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLogoClick = () => {
    if (authState.isAuthenticated && authState.profile) {
      // Redirect based on user role
      switch (authState.profile.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'host':
          navigate('/host');
          break;
        case 'coworker':
        default:
          navigate('/dashboard');
          break;
      }
    } else {
      navigate('/');
    }
  };

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Public navigation items (non-authenticated users)
  const publicNavItems = [
    { label: 'Spazi', href: '/spaces', icon: MapPin },
    { label: 'Eventi', href: '/events', icon: Calendar },
  ];

  // Role-based navigation items
  const getNavItemsByRole = () => {
    if (!authState.isAuthenticated || !authState.profile?.role) return publicNavItems;

    switch (authState.profile.role) {
      case 'coworker':
        return [
          { label: 'Spazi', href: '/spaces', icon: MapPin },
          { label: 'Eventi', href: '/events', icon: Calendar },
          { label: 'Prenotazioni', href: '/bookings', icon: Calendar },
          { label: 'Messaggi', href: '/messages', icon: MessageCircle },
          { label: 'Networking', href: '/networking', icon: Users },
        ];
      case 'host':
        return [
          { label: 'Dashboard Host', href: '/host', icon: Home },
          { label: 'I Miei Spazi', href: '/host/spaces', icon: Building },
          { label: 'I Miei Eventi', href: '/host/events', icon: Calendar },
          { label: 'Prenotazioni', href: '/bookings', icon: Calendar },
          { label: 'Messaggi', href: '/messages', icon: MessageCircle },
          { label: 'Networking', href: '/networking', icon: Users },
        ];
      case 'admin':
        return [
          { label: 'Dashboard Admin', href: '/admin', icon: Shield },
          { label: 'Gestisci Utenti', href: '/admin/users', icon: Users },
          { label: 'Logs di Sistema', href: '/admin/logs', icon: BarChart3 },
          { label: 'GDPR', href: '/admin/gdpr', icon: Shield },
        ];
      default:
        return publicNavItems;
    }
  };

  // Dropdown menu items for authenticated users
  const getDropdownMenuItems = () => {
    if (!authState.isAuthenticated || !authState.profile?.role) return [];

    const commonItems = [
      { label: 'Profilo', href: '/profile', icon: User },
    ];

    switch (authState.profile.role) {
      case 'coworker':
        return [
          ...commonItems,
          { label: 'Spazi', href: '/spaces', icon: MapPin },
          { label: 'Eventi', href: '/events', icon: Calendar },
          { label: 'Prenotazioni', href: '/bookings', icon: Calendar },
          { label: 'Messaggi', href: '/messages', icon: MessageCircle },
          { label: 'Networking', href: '/networking', icon: Users },
        ];
      case 'host':
        return [
          ...commonItems,
          { label: 'Dashboard Host', href: '/host', icon: Home },
          { label: 'I Miei Spazi', href: '/host/spaces', icon: Building },
          { label: 'I Miei Eventi', href: '/host/events', icon: Calendar },
          { label: 'Prenotazioni', href: '/bookings', icon: Calendar },
          { label: 'Messaggi', href: '/messages', icon: MessageCircle },
          { label: 'Networking', href: '/networking', icon: Users },
        ];
      case 'admin':
        return [
          ...commonItems,
          { label: 'Dashboard Admin', href: '/admin', icon: Shield },
          { label: 'Gestisci Utenti', href: '/admin/users', icon: Users },
          { label: 'Logs di Sistema', href: '/admin/logs', icon: BarChart3 },
          { label: 'GDPR', href: '/admin/gdpr', icon: Shield },
        ];
      default:
        return commonItems;
    }
  };

  const navItems = getNavItemsByRole();
  const dropdownItems = getDropdownMenuItems();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <button onClick={handleLogoClick} className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            Workover
          </span>
        </button>

        {/* Geographic Search Bar - visible for all users */}
        <div className="hidden md:flex flex-1 max-w-sm mx-6">
          <GeographicSearch placeholder="Cerca per città..." />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Notifications for authenticated users */}
          {authState.isAuthenticated && <NotificationIcon />}

          {/* Desktop User Menu */}
          {authState.isAuthenticated ? (
            <div className="hidden md:flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={authState.profile?.profile_photo_url || ''} 
                        alt={`${authState.profile?.first_name} ${authState.profile?.last_name}`}
                      />
                      <AvatarFallback>
                        {authState.profile?.first_name?.charAt(0)}
                        {authState.profile?.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">
                        {authState.profile?.first_name} {authState.profile?.last_name}
                      </p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {authState.user?.email}
                      </p>
                      {authState.profile?.role && (
                        <Badge variant="outline" className="w-fit">
                          {authState.profile.role === 'admin' ? 'Admin' : 
                           authState.profile.role === 'host' ? 'Host' : 'Coworker'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  
                  {dropdownItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link to={item.href} className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Impostazioni</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Accedi
              </Button>
              <Button onClick={() => navigate('/register')}>
                Registrati
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4 mt-8">
                {/* Mobile Search */}
                <GeographicSearch placeholder="Cerca per città..." />

                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                        isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                
                {authState.isAuthenticated && (
                  <>
                    <div className="border-t pt-4 mt-4" />
                    <div className="flex items-center space-x-2 px-2 py-1 bg-muted rounded-md">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={authState.profile?.profile_photo_url || ''} />
                        <AvatarFallback>
                          {authState.profile?.first_name?.charAt(0)}
                          {authState.profile?.last_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {authState.profile?.first_name} {authState.profile?.last_name}
                        </span>
                        {authState.profile?.role && (
                          <Badge variant="outline" className="w-fit text-xs">
                            {authState.profile.role === 'admin' ? 'Admin' : 
                             authState.profile.role === 'host' ? 'Host' : 'Coworker'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {dropdownItems.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                    
                    <div className="border-t pt-4 mt-4" />
                    <Link
                      to="/settings"
                      className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Impostazioni</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </>
                )}
                
                {!authState.isAuthenticated && (
                  <>
                    <div className="border-t pt-4 mt-4" />
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        navigate('/login');
                        setIsMobileMenuOpen(false);
                      }}
                      className="justify-start"
                    >
                      Accedi
                    </Button>
                    <Button 
                      onClick={() => {
                        navigate('/register');
                        setIsMobileMenuOpen(false);
                      }}
                      className="justify-start"
                    >
                      Registrati
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
