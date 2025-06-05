
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import AuthProtected from './components/auth/AuthProtected';
import RoleProtected from './components/auth/RoleProtected';
import AdminProtected from './components/auth/AdminProtected';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import HostDashboard from './pages/HostDashboard';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import UserProfileView from './pages/UserProfileView';
import Bookings from './pages/Bookings';
import Favorites from './pages/Favorites';
import Reviews from './pages/Reviews';
import BidirectionalReviews from './pages/BidirectionalReviews';
import Messages from './pages/Messages';
import MessageConversation from './pages/MessageConversation';
import SpaceNew from './pages/SpaceNew';
import SpacesManage from './pages/SpacesManage';
import SpaceEdit from './pages/SpaceEdit';
import SpaceDetail from './pages/SpaceDetail';
import EventDetail from './pages/EventDetail';
import NotFound from './pages/NotFound';
import Support from './pages/Support';
import Networking from './pages/Networking';
import NetworkingDiscover from './pages/NetworkingDiscover';
import { Toaster } from "@/components/ui/sonner"
import PublicSpaces from './pages/PublicSpaces';
import PublicEvents from './pages/PublicEvents';
import { PublicLayout } from './components/layout/PublicLayout';
import { MarketplaceLayout } from './components/layout/MarketplaceLayout';
import { AppLayout } from './components/layout/AppLayout';
import PrivateChats from './pages/PrivateChats';
import UserReportsPage from './pages/UserReportsPage';
import WaitlistsPage from './pages/WaitlistsPage';

// Static pages
import About from './pages/About';
import FAQ from './pages/FAQ';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import Unauthorized from './pages/Unauthorized';

// Lazy loaded admin pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminSpacesPage = lazy(() => import('./pages/admin/AdminSpacesPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminTicketsPage = lazy(() => import('./pages/admin/AdminTicketsPage'));
const AdminTagsPage = lazy(() => import('./pages/admin/AdminTagsPage'));
const AdminLogsPage = lazy(() => import('./pages/admin/AdminLogsPage'));
const AdminRouteCompletionPage = lazy(() => import('./pages/admin/AdminRouteCompletionPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Public routes - for non-authenticated users */}
            <Route path="/" element={<PublicLayout><Outlet /></PublicLayout>}>
              <Route index element={<Index />} />
              <Route path="/spaces" element={<PublicSpaces />} />
              <Route path="/events" element={<PublicEvents />} />
              <Route path="/spaces/:id" element={<SpaceDetail />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/contact" element={<Contact />} />
            </Route>

            {/* Unauthorized page - accessible to all */}
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected routes */}
            <Route element={<AuthProtected><Outlet /></AuthProtected>}>
              <Route path="/onboarding" element={<Onboarding />} />
              
              {/* Authenticated user routes - using MarketplaceLayout for full header */}
              <Route element={<MarketplaceLayout><Outlet /></MarketplaceLayout>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<UserProfileView />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/reviews" element={<Reviews />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:bookingId" element={<MessageConversation />} />
                <Route path="/private-chats" element={<PrivateChats />} />
                <Route path="/private-chats/:chatId" element={<PrivateChats />} />
                <Route path="/networking" element={<Networking />} />
                <Route path="/networking/discover" element={<NetworkingDiscover />} />
                <Route path="/support" element={<Support />} />
                <Route path="/reports" element={<UserReportsPage />} />
                <Route path="/waitlists" element={<WaitlistsPage />} />
                <Route path="/bidirectional-reviews" element={<BidirectionalReviews />} />
                
                {/* Authenticated routes for spaces and events - unified coworker experience */}
                <Route path="/app/spaces" element={<PublicSpaces />} />
                <Route path="/app/events" element={<PublicEvents />} />
                <Route path="/app/spaces/:id" element={<SpaceDetail />} />
                <Route path="/app/events/:id" element={<EventDetail />} />

                {/* Host routes - now all using MarketplaceLayout for consistent header */}
                <Route element={<RoleProtected allowedRoles={['host', 'admin']}><Outlet /></RoleProtected>}>
                  <Route path="/host" element={<HostDashboard />} />
                  <Route path="/host/dashboard" element={<HostDashboard />} />
                  {/* Fallback route for old Stripe redirect URL */}
                  <Route path="/host-dashboard" element={<Navigate to="/host/dashboard" replace />} />
                  
                  {/* Host space management routes - moved to MarketplaceLayout */}
                  <Route path="/spaces/manage" element={<SpacesManage />} />
                  <Route path="/spaces/new" element={<SpaceNew />} />
                  <Route path="/spaces/:id/edit" element={<SpaceEdit />} />
                </Route>
              </Route>

              {/* Admin routes - now with AdminProtected and lazy loading */}
              <Route element={<AdminProtected><Suspense fallback={<LoadingScreen />}><Outlet /></Suspense></AdminProtected>}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/spaces" element={<AdminSpacesPage />} />
                <Route path="/admin/reports" element={<AdminReportsPage />} />
                <Route path="/admin/tickets" element={<AdminTicketsPage />} />
                <Route path="/admin/tags" element={<AdminTagsPage />} />
                <Route path="/admin/logs" element={<AdminLogsPage />} />
                <Route path="/route-completion" element={<AdminRouteCompletionPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
