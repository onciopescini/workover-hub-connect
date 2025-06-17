
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GDPRProvider } from "@/components/gdpr/GDPRProvider";
import { AuthProvider } from "@/contexts/AuthContext";

// Layouts
import { MainLayout } from "@/components/layout/MainLayout";
import { MarketplaceLayout } from "@/components/layout/MarketplaceLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Auth protection
import AuthProtected from "@/components/auth/AuthProtected";
import { RoleProtected } from "@/components/auth/RoleProtected";

// Public pages
import Index from "@/pages/Index";
import PublicSpaces from "@/pages/PublicSpaces";
import PublicEvents from "@/pages/PublicEvents";
import About from "@/pages/About";
import FAQ from "@/pages/FAQ";
import Contact from "@/pages/Contact";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/NotFound";
import Maintenance from "@/pages/Maintenance";
import Offline from "@/pages/Offline";

// Auth pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";

// Protected pages
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import Profile from "@/pages/Profile";
import ProfileEdit from "@/pages/ProfileEdit";
import Bookings from "@/pages/Bookings";
import Messages from "@/pages/Messages";
import MessageConversation from "@/pages/MessageConversation";
import PrivateChats from "@/pages/PrivateChats";
import Networking from "@/pages/NetworkingAdvanced";
import NetworkingDiscover from "@/pages/NetworkingDiscover";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import Support from "@/pages/Support";
import Favorites from "@/pages/Favorites";
import BidirectionalReviews from "@/pages/BidirectionalReviews";
import Reviews from "@/pages/Reviews";
import UserReportsPage from "@/pages/UserReportsPage";
import WaitlistsPage from "@/pages/WaitlistsPage";

// Space management
import SpacesManage from "@/pages/SpacesManage";
import SpaceNew from "@/pages/SpaceNew";
import SpaceEdit from "@/pages/SpaceEdit";
import SpaceDetail from "@/pages/SpaceDetail";
import EventDetail from "@/pages/EventDetail";
import UserProfile from "@/pages/UserProfile";
import UserProfileView from "@/pages/UserProfileView";

// Host pages
import HostDashboard from "@/pages/HostDashboard";
import HostAnalytics from "@/pages/host/HostAnalytics";
import HostRevenue from "@/pages/host/HostRevenue";
import HostPayments from "@/pages/host/HostPayments";
import HostCalendar from "@/pages/host/HostCalendar";
import HostEvents from "@/pages/host/HostEvents";
import HostEventNew from "@/pages/host/HostEventNew";

// Admin pages
import AdminPanel from "@/pages/AdminPanel";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminSpacesPage from "@/pages/admin/AdminSpacesPage";
import AdminLogsPage from "@/pages/admin/AdminLogsPage";
import AdminReportsPage from "@/pages/admin/AdminReportsPage";
import AdminTicketsPage from "@/pages/admin/AdminTicketsPage";
import AdminTagsPage from "@/pages/admin/AdminTagsPage";
import AdminGDPRPage from "@/pages/admin/AdminGDPRPage";
import AdminRouteCompletionPage from "@/pages/admin/AdminRouteCompletionPage";
import ValidationDashboard from "@/pages/admin/ValidationDashboard";

// Privacy & Legal
import PrivacyCenter from "@/pages/PrivacyCenter";
import PrivacyDeletionRequest from "@/pages/PrivacyDeletionRequest";
import PrivacyExportRequest from "@/pages/PrivacyExportRequest";

// Development & Testing
import RouteCompletion from "@/pages/RouteCompletion";
import PaymentValidation from "@/pages/PaymentValidation";
import RegressionValidation from "@/pages/RegressionValidation";
import StripeValidationTest from "@/pages/StripeValidationTest";
import { ValidationDashboard as ValidationDashboardMain } from "@/pages/ValidationDashboard";

import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GDPRProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                {/* Public routes with MainLayout */}
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Index />} />
                  <Route path="spaces" element={<PublicSpaces />} />
                  <Route path="spaces/:id" element={<SpaceDetail />} />
                  <Route path="events" element={<PublicEvents />} />
                  <Route path="events/:id" element={<EventDetail />} />
                  <Route path="about" element={<About />} />
                  <Route path="faq" element={<FAQ />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="terms" element={<Terms />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                  <Route path="auth/callback" element={<AuthCallback />} />
                  <Route path="users/:id" element={<UserProfileView />} />
                  
                  {/* Privacy routes */}
                  <Route path="privacy-center" element={<PrivacyCenter />} />
                  <Route path="privacy/deletion-request" element={<PrivacyDeletionRequest />} />
                  <Route path="privacy/export-request" element={<PrivacyExportRequest />} />
                  
                  {/* Development routes */}
                  <Route path="maintenance" element={<Maintenance />} />
                  <Route path="offline" element={<Offline />} />
                  <Route path="route-completion" element={<RouteCompletion />} />
                </Route>

                {/* Protected routes with MainLayout */}
                <Route path="/" element={<MainLayout />}>
                  <Route path="onboarding" element={
                    <AuthProtected requireOnboarding={false}>
                      <Onboarding />
                    </AuthProtected>
                  } />
                  
                  <Route path="dashboard" element={
                    <AuthProtected>
                      <Dashboard />
                    </AuthProtected>
                  } />
                  
                  <Route path="profile" element={
                    <AuthProtected>
                      <Profile />
                    </AuthProtected>
                  } />
                  
                  <Route path="profile/edit" element={
                    <AuthProtected>
                      <ProfileEdit />
                    </AuthProtected>
                  } />
                  
                  <Route path="bookings" element={
                    <AuthProtected>
                      <Bookings />
                    </AuthProtected>
                  } />
                  
                  <Route path="messages" element={
                    <AuthProtected>
                      <Messages />
                    </AuthProtected>
                  } />
                  
                  <Route path="messages/:bookingId" element={
                    <AuthProtected>
                      <MessageConversation />
                    </AuthProtected>
                  } />
                  
                  <Route path="private-chats" element={
                    <AuthProtected>
                      <PrivateChats />
                    </AuthProtected>
                  } />
                  
                  <Route path="networking" element={
                    <AuthProtected>
                      <Networking />
                    </AuthProtected>
                  } />
                  
                  <Route path="networking/discover" element={
                    <AuthProtected>
                      <NetworkingDiscover />
                    </AuthProtected>
                  } />
                  
                  <Route path="notifications" element={
                    <AuthProtected>
                      <Notifications />
                    </AuthProtected>
                  } />
                  
                  <Route path="settings" element={
                    <AuthProtected>
                      <Settings />
                    </AuthProtected>
                  } />
                  
                  <Route path="help" element={
                    <AuthProtected>
                      <Help />
                    </AuthProtected>
                  } />
                  
                  <Route path="support" element={
                    <AuthProtected>
                      <Support />
                    </AuthProtected>
                  } />
                  
                  <Route path="favorites" element={
                    <AuthProtected>
                      <Favorites />
                    </AuthProtected>
                  } />
                  
                  <Route path="reviews" element={
                    <AuthProtected>
                      <BidirectionalReviews />
                    </AuthProtected>
                  } />
                  
                  <Route path="user-reviews" element={
                    <AuthProtected>
                      <Reviews />
                    </AuthProtected>
                  } />
                  
                  <Route path="user-reports" element={
                    <AuthProtected>
                      <UserReportsPage />
                    </AuthProtected>
                  } />
                  
                  <Route path="waitlists" element={
                    <AuthProtected>
                      <WaitlistsPage />
                    </AuthProtected>
                  } />
                  
                  <Route path="user-profile" element={
                    <AuthProtected>
                      <UserProfile />
                    </AuthProtected>
                  } />
                </Route>

                {/* Marketplace routes */}
                <Route path="/" element={
                  <AuthProtected>
                    <MarketplaceLayout />
                  </AuthProtected>
                }>
                  <Route path="spaces/manage" element={<SpacesManage />} />
                  <Route path="spaces/new" element={<SpaceNew />} />
                  <Route path="spaces/:id/edit" element={<SpaceEdit />} />
                </Route>

                {/* Host routes */}
                <Route path="/host" element={
                  <AuthProtected>
                    <RoleProtected allowedRoles={['host']}>
                      <MainLayout />
                    </RoleProtected>
                  </AuthProtected>
                }>
                  <Route path="dashboard" element={<HostDashboard />} />
                  <Route path="spaces" element={<SpacesManage />} />
                  <Route path="analytics" element={<HostAnalytics />} />
                  <Route path="revenue" element={<HostRevenue />} />
                  <Route path="payments" element={<HostPayments />} />
                  <Route path="calendar" element={<HostCalendar />} />
                  <Route path="events" element={<HostEvents />} />
                  <Route path="events/new" element={<HostEventNew />} />
                </Route>

                {/* Admin routes */}
                <Route path="/admin" element={
                  <AuthProtected>
                    <RoleProtected allowedRoles={['admin']}>
                      <AdminLayout />
                    </RoleProtected>
                  </AuthProtected>
                }>
                  <Route index element={<AdminPanel />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="spaces" element={<AdminSpacesPage />} />
                  <Route path="logs" element={<AdminLogsPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="tickets" element={<AdminTicketsPage />} />
                  <Route path="tags" element={<AdminTagsPage />} />
                  <Route path="gdpr" element={<AdminGDPRPage />} />
                  <Route path="route-completion" element={<AdminRouteCompletionPage />} />
                  <Route path="validation" element={<ValidationDashboard />} />
                </Route>

                {/* Development/Testing routes */}
                <Route path="/dev" element={<MainLayout />}>
                  <Route path="payment-validation" element={<PaymentValidation />} />
                  <Route path="regression-validation" element={<RegressionValidation />} />
                  <Route path="stripe-validation" element={<StripeValidationTest />} />
                  <Route path="validation-dashboard" element={<ValidationDashboardMain />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </GDPRProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
