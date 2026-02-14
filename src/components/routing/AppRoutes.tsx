
import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import QAValidationDashboard from "@/components/qa/QAValidationDashboard";

// Layouts
import { MainLayout } from "@/components/layout/MainLayout";
import { AdminLayout } from "@/layouts/AdminLayout";

// Auth protection
import AuthFlowGate from "@/components/auth/AuthFlowGate";
import RoleProtected from "@/components/auth/RoleProtected";

// Public pages (eager loading per performance)
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import About from "@/pages/About";
import FAQ from "@/pages/FAQ";
import Contact from "@/pages/Contact";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/NotFound";

const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const PrivacyExportRequest = lazy(() => import("@/pages/PrivacyExportRequest"));
const PrivacyDeletionRequest = lazy(() => import("@/pages/PrivacyDeletionRequest"));
const PrivacyConfirmDeletion = lazy(() => import("@/pages/PrivacyConfirmDeletion"));
const LegalHistory = lazy(() => import("@/pages/LegalHistory"));
const Guides = lazy(() => import("@/pages/Guides"));

// Lazy loading per pagine non critiche
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Profile = lazy(() => import("@/pages/Profile"));
const ProfileEdit = lazy(() => import("@/pages/ProfileEdit"));
const UserProfileView = lazy(() => import("@/pages/UserProfileView"));
import Bookings from "@/pages/Bookings";
const Search = lazy(() => import("@/pages/Search"));
const Favorites = lazy(() => import("@/pages/Favorites"));

// Replaced Messaging Modules
const MessagesPage = lazy(() => import("@/pages/messages/MessagesPage"));

const Networking = lazy(() => import("@/pages/NetworkingAdvanced"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Settings = lazy(() => import("@/pages/Settings"));
const NetworkingSettings = lazy(() => import("@/pages/NetworkingSettings"));
const SpaceDetail = lazy(() => import("@/pages/SpaceDetail"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const Support = lazy(() => import("@/pages/Support"));

// Host pages
const HostPaymentsPage = lazy(() => import("@/pages/host/HostPaymentsPage"));
const HostDashboard = lazy(() => import("@/pages/HostDashboard"));
const StripeReturn = lazy(() => import("@/pages/host/StripeReturn"));
const BecomeHost = lazy(() => import("@/pages/host/BecomeHost"));
const SpaceNew = lazy(() => import("@/pages/SpaceNew"));
const SpacesManage = lazy(() => import("@/pages/SpacesManage"));
const SpaceEdit = lazy(() => import("@/pages/SpaceEdit"));
const SpaceRecap = lazy(() => import("@/pages/SpaceRecap"));
const HostCalendar = lazy(() => import("@/pages/host/HostCalendar"));
const HostFiscalPage = lazy(() => import("@/pages/host/HostFiscalPage"));
const HostInvoicesPage = lazy(() => import("@/pages/host/HostInvoicesPage"));
const KYCVerificationPage = lazy(() => import("@/pages/host/KYCVerificationPage"));
const HostWalletPage = lazy(() => import("@/pages/host/HostWalletPage"));

// Coworker pages
const MyDocumentsPage = lazy(() => import("@/pages/coworker/MyDocumentsPage"));

// Admin pages
const AdminMissionControlDashboard = lazy(() => import("@/pages/admin/AdminMissionControlDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminUserInspectorPage = lazy(() => import("@/pages/admin/AdminUserInspectorPage"));
const AdminTicketManagement = lazy(() => import("@/pages/admin/AdminTicketManagement"));
const AdminRevenue = lazy(() => import("@/pages/admin/AdminRevenue"));
const AdminBookings = lazy(() => import("@/pages/admin/AdminBookingsPage"));
const AdminDisputesPage = lazy(() => import("@/pages/admin/AdminDisputesPage"));
const AdminKYC = lazy(() => import("@/pages/admin/AdminKYC"));
const AdminInvoicesPage = lazy(() => import("@/pages/admin/AdminInvoicesPage"));

const BookingSuccess = lazy(() => import("@/pages/BookingSuccess"));
const BookingCancelled = lazy(() => import("@/pages/BookingCancelled"));
const BookingDetail = lazy(() => import("@/pages/BookingDetail"));

// Wrapper per lazy loading
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingScreen />}>
    {children}
  </Suspense>
);

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Unified routes with MainLayout */}
      <Route path="/" element={<MainLayout />}>
        {/* Public routes */}
        <Route index element={<Index />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="auth/callback" element={<AuthCallback />} />
        
        {/* Public content */}
        <Route path="spaces" element={<Navigate to="/search" replace />} />
        <Route path="public-spaces" element={<Navigate to="/search" replace />} />
        <Route path="search" element={
          <LazyWrapper>
            <Search />
          </LazyWrapper>
        } />
        <Route path="spaces/new" element={<Navigate to="/host/spaces/new" replace />} />
        <Route path="spaces/:id" element={
          <LazyWrapper>
            <SpaceDetail />
          </LazyWrapper>
        } />
        <Route path="spaces/:id/booking-success" element={
          <LazyWrapper>
            <BookingSuccess />
          </LazyWrapper>
        } />
        <Route path="spaces/:id/booking-cancelled" element={
          <LazyWrapper>
            <BookingCancelled />
          </LazyWrapper>
        } />
        {/* Legacy redirect from removed Events section */}
        <Route path="events" element={<Navigate to="/networking" replace />} />

        {/* Redirect /space/new to /host/spaces/new */}
        <Route path="space/new" element={<Navigate to="/host/spaces/new" replace />} />
        
        {/* Public user profiles */}
        <Route path="users/:userId" element={
          <LazyWrapper>
            <UserProfileView />
          </LazyWrapper>
        } />
        
        {/* Static pages */}
        <Route path="about" element={<About />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="contact" element={<Contact />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="cookies" element={<Navigate to="/privacy-policy#cookies" replace />} />
        <Route path="privacy-policy" element={
          <LazyWrapper>
            <PrivacyPolicy />
          </LazyWrapper>
        } />
        <Route path="privacy/export-request" element={
          <AuthFlowGate>
            <LazyWrapper>
              <PrivacyExportRequest />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="privacy/confirm-deletion/:token" element={
          <LazyWrapper>
            <PrivacyConfirmDeletion />
          </LazyWrapper>
        } />
        
        <Route path="legal/history/:document_type" element={
          <LazyWrapper>
            <LegalHistory />
          </LazyWrapper>
        } />

        {/* Protected routes */}
        <Route path="onboarding" element={
          <AuthFlowGate requireOnboarding={false}>
            <LazyWrapper>
              <Onboarding />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="dashboard" element={
          <AuthFlowGate>
            <LazyWrapper>
              <Dashboard />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="profile" element={
          <AuthFlowGate>
            <LazyWrapper>
              <Profile />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="profile/edit" element={
          <AuthFlowGate>
            <LazyWrapper>
              <ProfileEdit />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="favorites" element={
          <AuthFlowGate>
            <LazyWrapper>
              <Favorites />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="bookings" element={
          <AuthFlowGate>
            <Bookings />
          </AuthFlowGate>
        } />


        <Route path="bookings/:id" element={
          <AuthFlowGate>
            <LazyWrapper>
              <BookingDetail />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="messages" element={
          <AuthFlowGate>
            <LazyWrapper>
              <MessagesPage />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="messages/:id" element={
          <AuthFlowGate>
            <LazyWrapper>
              <MessagesPage />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        {/* Redirect Legacy Message Routes to New One */}
        <Route path="messages/conversation/:conversationId" element={<Navigate to="/messages" replace />} />
        
        <Route path="networking" element={
          <AuthFlowGate>
            <LazyWrapper>
              <Networking />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="reviews" element={
          <AuthFlowGate>
            <LazyWrapper>
              <Reviews />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="notifications" element={
          <AuthFlowGate>
            <LazyWrapper>
              <Notifications />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="settings" element={
          <AuthFlowGate>
            <LazyWrapper>
              <Settings />
            </LazyWrapper>
          </AuthFlowGate>
        } />
        
        <Route path="settings/networking" element={
          <AuthFlowGate>
            <LazyWrapper>
              <NetworkingSettings />
            </LazyWrapper>
          </AuthFlowGate>
        } />

        <Route path="support" element={
          <LazyWrapper>
            <Support />
          </LazyWrapper>
        } />
        
        {/* Help redirect to support */}
        <Route path="help" element={<Navigate to="/support" replace />} />
        
        {/* Guides page */}
        <Route path="guides" element={
          <LazyWrapper>
            <Guides />
          </LazyWrapper>
        } />
        
        {/* Coworker documents */}
        <Route path="my-documents" element={
          <AuthFlowGate>
            <LazyWrapper>
              <MyDocumentsPage />
            </LazyWrapper>
          </AuthFlowGate>
        } />

        <Route path="host/become" element={
          <AuthFlowGate>
            <LazyWrapper>
              <BecomeHost />
            </LazyWrapper>
          </AuthFlowGate>
        } />

        {/* QA Validation Dashboard */}
        <Route path="qa-validation" element={
          <LazyWrapper>
            <QAValidationDashboard />
          </LazyWrapper>
        } />

        {/* Legacy host routes - redirects to unified /host structure */}
      </Route>

      {/* Host routes */}
      <Route path="/host" element={
        <AuthFlowGate>
          <RoleProtected allowedRoles={['host']}>
            <MainLayout />
          </RoleProtected>
        </AuthFlowGate>
      }>
        <Route path="onboarding" element={<Navigate to="/host/become" replace />} />
        <Route path="dashboard" element={
          <LazyWrapper>
            <HostDashboard />
          </LazyWrapper>
        } />
        
        {/* Host space management under unified /host structure */}
        <Route path="spaces" element={
          <LazyWrapper>
            <SpacesManage />
          </LazyWrapper>
        } />
        <Route path="space/new" element={<Navigate to="/host/spaces/new" replace />} />
        <Route path="spaces/new" element={
          <LazyWrapper>
            <SpaceNew />
          </LazyWrapper>
        } />
        <Route path="space/edit/:id" element={
          <LazyWrapper>
            <SpaceEdit />
          </LazyWrapper>
        } />
        <Route path="spaces/:spaceId/recap" element={
          <LazyWrapper>
            <SpaceRecap />
          </LazyWrapper>
        } />
        <Route path="stripe/return" element={
          <LazyWrapper>
            <StripeReturn />
          </LazyWrapper>
        } />
        <Route path="calendar" element={
          <LazyWrapper>
            <HostCalendar />
          </LazyWrapper>
        } />
        <Route path="payments" element={
          <LazyWrapper>
            <HostPaymentsPage />
          </LazyWrapper>
        } />
        <Route path="fiscal" element={
          <LazyWrapper>
            <HostFiscalPage />
          </LazyWrapper>
        } />
        <Route path="invoices" element={
          <LazyWrapper>
            <HostInvoicesPage />
          </LazyWrapper>
        } />
        <Route path="kyc" element={
          <LazyWrapper>
            <KYCVerificationPage />
          </LazyWrapper>
        } />
        <Route path="wallet" element={
          <LazyWrapper>
            <HostWalletPage />
          </LazyWrapper>
        } />
        
        {/* Redirect old routes to unified dashboard */}
        <Route path="analytics" element={
          <LazyWrapper>
            <HostDashboard />
          </LazyWrapper>
        } />
        <Route path="revenue" element={
          <LazyWrapper>
            <HostDashboard />
          </LazyWrapper>
        } />
      </Route>

      {/* Admin routes - Secure Guard */}
      <Route path="/admin/*" element={<AdminLayout />}>
        <Route index element={
          <LazyWrapper>
            <AdminMissionControlDashboard />
          </LazyWrapper>
        } />
        <Route path="dashboard" element={
          <LazyWrapper>
            <AdminMissionControlDashboard />
          </LazyWrapper>
        } />
        <Route path="tickets" element={
          <LazyWrapper>
            <AdminTicketManagement />
          </LazyWrapper>
        } />
        <Route path="users" element={
          <LazyWrapper>
            <AdminUsers />
          </LazyWrapper>
        } />
        <Route path="users/:id" element={
          <LazyWrapper>
            <AdminUserInspectorPage />
          </LazyWrapper>
        } />
        <Route path="bookings" element={
          <LazyWrapper>
            <AdminBookings />
          </LazyWrapper>
        } />
        <Route path="disputes" element={
          <LazyWrapper>
            <AdminDisputesPage />
          </LazyWrapper>
        } />
        <Route path="revenue" element={
          <LazyWrapper>
            <AdminRevenue />
          </LazyWrapper>
        } />
        <Route path="kyc" element={
          <LazyWrapper>
            <AdminKYC />
          </LazyWrapper>
        } />
        <Route path="invoices" element={
          <LazyWrapper>
            <AdminInvoicesPage />
          </LazyWrapper>
        } />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
