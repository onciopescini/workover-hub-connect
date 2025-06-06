
import React, { useState, useEffect } from 'react';
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
  Home, 
  MapPin, 
  Calendar,
  MessageCircle,
  Users,
  CreditCard,
  Building,
  Plus,
  BarChart3,
  Shield,
  Bell
} from 'lucide-react';
import { NotificationIcon } from '@/components/notifications/NotificationIcon';

// Define proper types for navigation items
type NavigationItem = {
  label: string;
  href: string;
  icon: any;
  badge?: number;
};

type NavigationSeparator = {
  type: 'separator';
};

type MenuItem = NavigationItem | NavigationSeparator;

export function UnifiedHeader() {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (authState.isAuthenticated && authState.user?.id) {
        // Fetch unread messages count
        // Replace with your actual logic to fetch unread messages
        // Example:
        // const count = await getUnreadMessagesCount(authState.user.id);
        // setUnreadCount(count);
        setUnreadCount(0); // Placeholder
      } else {
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
  }, [authState.isAuthenticated, authState.user?.id]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Spazi', href: '/spaces', icon: MapPin },
    { label: 'Eventi', href: '/events', icon: Calendar },
  ];

  const userMenuItems: NavigationItem[] = authState.isAuthenticated ? [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Profilo', href: '/profile', icon: User },
    { label: 'Prenotazioni', href: '/bookings', icon: Calendar },
    { label: 'Messaggi', href: '/messages', icon: MessageCircle, badge: unreadCount > 0 ? unreadCount : undefined },
    { label: 'Network', href: '/networking', icon: Users },
  ] : [];

  const hostMenuItems: MenuItem[] = authState.profile?.role === 'host' ? [
    { type: 'separator' as const },
    { label: 'I Miei Spazi', href: '/manage-space', icon: Building },
    { label: 'Crea Spazio', href: '/create-space', icon: Plus },
    { label: 'I Miei Eventi', href: '/host/events', icon: Calendar },
    { label: 'Pagamenti', href: '/payments-dashboard', icon: CreditCard },
    { label: 'Analytics', href: '/host/analytics', icon: BarChart3 },
  ] : [];

  const adminMenuItems: MenuItem[] = authState.profile?.role === 'admin' ? [
    { type: 'separator' as const },
    { label: 'Pannello Admin', href: '/admin/users', icon: Shield },
  ] : [];

  const allMenuItems: MenuItem[] = [...userMenuItems, ...hostMenuItems, ...adminMenuItems];

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            Workover
          </span>
        </Link>

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
          {/* Notifications */}
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
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  
                  {allMenuItems.map((item, index) => 
                    'type' in item && item.type === 'separator' ? (
                      <DropdownMenuSeparator key={index} />
                    ) : (
                      <DropdownMenuItem key={(item as NavigationItem).href} asChild>
                        <Link to={(item as NavigationItem).href} className="flex items-center gap-2">
                          <(item as NavigationItem).icon className="h-4 w-4" />
                          <span>{(item as NavigationItem).label}</span>
                          {(item as NavigationItem).badge && (
                            <Badge variant="secondary" className="ml-auto">
                              {(item as NavigationItem).badge}
                            </Badge>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    )
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile/edit" className="flex items-center gap-2">
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
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                      isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                
                {authState.isAuthenticated && (
                  <>
                    <div className="border-t pt-4 mt-4" />
                    {allMenuItems.map((item, index) => 
                      'type' in item && item.type === 'separator' ? (
                        <div key={index} className="border-t pt-2 mt-2" />
                      ) : (
                        <Link
                          key={(item as NavigationItem).href}
                          to={(item as NavigationItem).href}
                          className="flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <(item as NavigationItem).icon className="h-4 w-4" />
                          <span>{(item as NavigationItem).label}</span>
                          {(item as NavigationItem).badge && (
                            <Badge variant="secondary" className="ml-auto">
                              {(item as NavigationItem).badge}
                            </Badge>
                          )}
                        </Link>
                      )
                    )}
                    
                    <div className="border-t pt-4 mt-4" />
                    <Link
                      to="/profile/edit"
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
