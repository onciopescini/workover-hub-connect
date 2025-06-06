import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { Home } from '@/pages/Home';
import { Spaces } from '@/pages/spaces/Spaces';
import { SpaceDetails } from '@/pages/spaces/SpaceDetails';
import { Profile } from '@/pages/profile/Profile';
import { Bookings } from '@/pages/bookings/Bookings';
import { Payments } from '@/pages/payments/Payments';
import { ManageSpace } from '@/pages/spaces/ManageSpace';
import { CreateSpace } from '@/pages/spaces/CreateSpace';
import { UpdateSpace } from '@/pages/spaces/UpdateSpace';
import { StripeCallback } from '@/pages/stripe/StripeCallback';
import { NotFound } from '@/pages/NotFound';
import { About } from '@/pages/About';
import { Contact } from '@/pages/Contact';
import { Terms } from '@/pages/Terms';
import { Privacy } from '@/pages/Privacy';
import { Help } from '@/pages/Help';
import { Blog } from '@/pages/Blog';
import { BlogArticle } from '@/pages/BlogArticle';
import { PaymentsDashboard } from '@/components/payments/PaymentsDashboard';
import { BecomeHost } from '@/pages/profile/BecomeHost';
import { Users } from '@/pages/admin/Users';
import { SpacesAdmin } from '@/pages/admin/SpacesAdmin';
import { BookingsAdmin } from '@/pages/admin/BookingsAdmin';
import { useToast } from "@/components/ui/use-toast"
import { checkAndUpdateStripeStatus } from '@/lib/stripe-status-utils';
import { Dashboard } from '@/pages/Dashboard';
import { Notifications } from '@/pages/notifications/Notifications';
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
    if (authState.isAuthenticated) {
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
        variant: toastType,
    })
      // Clear the toast message from the URL
      const newUrl = location.pathname;
      navigate(newUrl, { replace: true });
    }
  }, [location, navigate, toast]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/spaces" element={<Spaces />} />
        <Route path="/spaces/:id" element={<SpaceDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/become-host" element={<BecomeHost />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/payments-dashboard" element={<PaymentsDashboard />} />
        <Route path="/manage-space" element={<ManageSpace />} />
        <Route path="/create-space" element={<CreateSpace />} />
        <Route path="/update-space/:id" element={<UpdateSpace />} />
        <Route path="/stripe/callback" element={<StripeCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/help" element={<Help />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogArticle />} />
        
        {/* Admin routes */}
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/spaces" element={<SpacesAdmin />} />
        <Route path="/admin/bookings" element={<BookingsAdmin />} />

        <Route path="/validation" element={<PaymentValidation />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default App;
