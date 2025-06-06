
import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import Index from '@/pages/Index';
import PublicSpaces from '@/pages/PublicSpaces';
import SpaceDetail from '@/pages/SpaceDetail';
import Profile from '@/pages/Profile';
import Bookings from '@/pages/Bookings';
import { Payments } from '@/pages/payments/Payments';
import SpacesManage from '@/pages/SpacesManage';
import SpaceNew from '@/pages/SpaceNew';
import SpaceEdit from '@/pages/SpaceEdit';
import AuthCallback from '@/pages/AuthCallback';
import NotFound from '@/pages/NotFound';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Terms from '@/pages/Terms';
import Privacy from '@/pages/Privacy';
import Help from '@/pages/Help';
import PublicEvents from '@/pages/PublicEvents';
import EventDetail from '@/pages/EventDetail';
import { PaymentsDashboard } from '@/components/payments/PaymentsDashboard';
import Onboarding from '@/pages/Onboarding';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminSpacesPage } from '@/pages/admin/AdminSpacesPage';
import { AdminLogsPage } from '@/pages/admin/AdminLogsPage';
import { useToast } from "@/components/ui/use-toast"
import { checkAndUpdateStripeStatus } from '@/lib/stripe-status-utils';
import Dashboard from '@/pages/Dashboard';
import Notifications from '@/pages/Notifications';
import PaymentValidation from './pages/PaymentValidation';

function App() {
  const { authState, refreshUserProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast()

  useEffect(() => {
    // Redirect user to home page after login
    if (authState.isAuthenticated && location.pathname === '/login') {
      navigate('/');
    }
  }, [authState.isAuthenticated, location, navigate]);

  useEffect(() => {
    // Check Stripe status on profile load
    if (authState.profile?.id && authState.profile?.role === 'host') {
      checkAndUpdateStripeStatus(authState.profile.id);
    }
  }, [authState.profile]);

  useEffect(() => {
    // Refresh user profile on app load
    if (authState.isAuthenticated && refreshUserProfile) {
      refreshUserProfile();
    }
  }, [authState.isAuthenticated, refreshUserProfile]);

  useEffect(() => {
    // Display toast message from URL params
    const params = new URLSearchParams(location.search);
    const toastMessage = params.get('toast');
    const toastType = params.get('toastType') || 'success';

    if (toastMessage) {
      toast({
      title: toastType === 'success' ? 'Successo!' : 'Attenzione!',
        description: toastMessage,
        variant: toastType === 'success' ? 'default' : 'destructive',
    })
      // Clear the toast message from the URL
      const newUrl = location.pathname;
      navigate(newUrl, { replace: true });
    }
  }, [location, navigate, toast]);

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/spaces" element={<PublicSpaces />} />
        <Route path="/spaces/:id" element={<SpaceDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/become-host" element={<Onboarding />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/payments-dashboard" element={<PaymentsDashboard />} />
        <Route path="/manage-space" element={<SpacesManage />} />
        <Route path="/create-space" element={<SpaceNew />} />
        <Route path="/update-space/:id" element={<SpaceEdit />} />
        <Route path="/stripe/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/help" element={<Help />} />
        <Route path="/events" element={<PublicEvents />} />
        <Route path="/events/:id" element={<EventDetail />} />
        
        {/* Admin routes */}
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/spaces" element={<AdminSpacesPage />} />
        <Route path="/admin/logs" element={<AdminLogsPage />} />

        <Route path="/validation" element={<PaymentValidation />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
