import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import AdminProtected from './components/auth/AdminProtected';
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import PublicSpaces from './pages/PublicSpaces';
import SpaceDetail from './pages/SpaceDetail';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import Bookings from './pages/Bookings';
import Messages from './pages/Messages';
import Networking from './pages/Networking';
import SpacesManage from './pages/SpacesManage';
import SpaceNew from './pages/SpaceNew';
import SpaceEdit from './pages/SpaceEdit';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';
import About from './pages/About';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Help from './pages/Help';
import PublicEvents from './pages/PublicEvents';
import EventDetail from './pages/EventDetail';
import { PaymentsDashboard } from './components/payments/PaymentsDashboard';
import Onboarding from './pages/Onboarding';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSpacesPage from './pages/admin/AdminSpacesPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import ValidationDashboard from './pages/ValidationDashboard';
import { useToast } from "./components/ui/use-toast"
import { checkAndUpdateStripeStatus } from './lib/stripe-status-utils';
import Dashboard from './pages/Dashboard';
import Notifications from './pages/Notifications';
import PaymentValidation from './pages/PaymentValidation';
import PrivateChats from './pages/PrivateChats';
import HostEvents from './pages/host/HostEvents';
import HostEventNew from './pages/host/HostEventNew';
import HostRevenue from './pages/host/HostRevenue';
import PrivacyExportRequest from './pages/PrivacyExportRequest';
import PrivacyDeletionRequest from './pages/PrivacyDeletionRequest';
import RegressionValidation from './pages/RegressionValidation';

function App() {
  const { authState } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast()

  useEffect(() => {
    // Redirect user to dashboard after login, not home page
    if (authState.isAuthenticated && location.pathname === '/login') {
      navigate('/dashboard');
    }
  }, [authState.isAuthenticated, location, navigate]);

  useEffect(() => {
    // Check Stripe status on profile load
    if (authState.profile?.id && authState.profile?.role === 'host') {
      checkAndUpdateStripeStatus(authState.profile.id);
    }
  }, [authState.profile]);

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
    <Routes>
      {/* Public routes without main layout */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Routes with main layout */}
      <Route path="/*" element={
        <MainLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/spaces" element={<PublicSpaces />} />
            <Route path="/spaces/:id" element={<SpaceDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/profile/become-host" element={<Onboarding />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/private-chats/:chatId" element={<PrivateChats />} />
            <Route path="/networking" element={<Networking />} />
            <Route path="/payments-dashboard" element={<PaymentsDashboard />} />
            <Route path="/manage-space" element={<SpacesManage />} />
            <Route path="/create-space" element={<SpaceNew />} />
            <Route path="/update-space/:id" element={<SpaceEdit />} />
            <Route path="/stripe/callback" element={<AuthCallback />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/privacy/export-request" element={<PrivacyExportRequest />} />
            <Route path="/privacy/deletion-request" element={<PrivacyDeletionRequest />} />
            <Route path="/help" element={<Help />} />
            <Route path="/events" element={<PublicEvents />} />
            <Route path="/events/:id" element={<EventDetail />} />
            
            {/* Host event routes */}
            <Route path="/host/events" element={<HostEvents />} />
            <Route path="/host/events/new" element={<HostEventNew />} />
            <Route path="/host/revenue" element={<HostRevenue />} />
            
            {/* Admin routes */}
            <Route path="/admin/users" element={<AdminProtected><AdminUsersPage /></AdminProtected>} />
            <Route path="/admin/spaces" element={<AdminProtected><AdminSpacesPage /></AdminProtected>} />
            <Route path="/admin/logs" element={<AdminProtected><AdminLogsPage /></AdminProtected>} />
            <Route path="/admin/validation" element={<AdminProtected><ValidationDashboard /></AdminProtected>} />

            {/* Payment validation route - Admin only */}
            <Route path="/validation" element={<AdminProtected><PaymentValidation /></AdminProtected>} />
            
            {/* Regression validation route - Admin only */}
            <Route path="/regression-validation" element={<AdminProtected><RegressionValidation /></AdminProtected>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      } />
    </Routes>
  );
}

export default App;
