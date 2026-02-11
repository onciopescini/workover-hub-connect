import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthLogic } from '@/hooks/auth/useAuthLogic';
import { LayoutDashboard, Users, Calendar, DollarSign, LogOut, Shield, Ticket, ReceiptText, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/LoadingScreen';
import { ADMIN_ROLES, ADMIN_ROUTES } from '@/constants/admin';

export const AdminLayout = () => {
  const { authState } = useAuthLogic();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      if (authState.isLoading) {
        return;
      }

      if (!authState.isAuthenticated || !authState.user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authState.user.id)
        .eq('role', ADMIN_ROLES.ADMIN)
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error || !data) {
        console.error('Access denied or error checking admin status:', error);
        navigate('/');
        return;
      }

      setIsAuthorized(true);
    };

    void checkAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [authState.isLoading, authState.isAuthenticated, authState.user, navigate]);

  if (authState.isLoading || isAuthorized === null) {
    return <LoadingScreen />;
  }

  const navItems = [
    { label: 'Mission Control', path: ADMIN_ROUTES.DASHBOARD, icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Tickets', path: ADMIN_ROUTES.TICKETS, icon: <Ticket className="w-4 h-4" /> },
    { label: 'Users', path: ADMIN_ROUTES.USERS, icon: <Users className="w-4 h-4" /> },
    { label: 'Bookings', path: ADMIN_ROUTES.BOOKINGS, icon: <Calendar className="w-4 h-4" /> },
    { label: 'Disputes', path: ADMIN_ROUTES.DISPUTES, icon: <Scale className="w-4 h-4" /> },
    { label: 'KYC Verification', path: ADMIN_ROUTES.KYC, icon: <Shield className="w-4 h-4" /> },
    { label: 'Platform Revenue', path: ADMIN_ROUTES.REVENUE, icon: <DollarSign className="w-4 h-4" /> },
    { label: 'Invoices', path: ADMIN_ROUTES.INVOICES, icon: <ReceiptText className="w-4 h-4" /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-gray-900">Admin Panel</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {authState.profile?.first_name?.[0] || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">
                {authState.profile?.first_name} {authState.profile?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">Admin</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};
