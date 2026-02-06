
import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import QAValidationDashboard from "@/components/qa/QAValidationDashboard";

// Layouts
import { MainLayout } from "@/components/layout/MainLayout";
import { AdminLayout } from "@/layouts/AdminLayout";

// Auth protection
import AuthProtected from "@/components/auth/AuthProtected";
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
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminRevenue = lazy(() => import("@/pages/admin/AdminRevenue"));
const AdminBookings = lazy(() => import("@/pages/admin/AdminBookingsPage"));
const AdminKYC = lazy(() => import("@/pages/admin/AdminKYC"));

const BookingSuccess = lazy(() => import("@/pages/BookingSuccess"));
const BookingCancelled = lazy(() => import("@/pages/BookingCancelled"));

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

        {/* Redirect /space/new to /host/space/new */}
        <Route path="space/new" element={<Navigate to="/host/space/new" replace />} />
        
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
          <AuthProtected>
            <LazyWrapper>
              <PrivacyExportRequest />
            </LazyWrapper>
          </AuthProtected>
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
          <AuthProtected requireOnboarding={false}>
            <LazyWrapper>
              <Onboarding />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="dashboard" element={
          <AuthProtected>
            <LazyWrapper>
              <Dashboard />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="profile" element={
          <AuthProtected>
            <LazyWrapper>
              <Profile />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="profile/edit" element={
          <AuthProtected>
            <LazyWrapper>
              <ProfileEdit />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="favorites" element={
          <AuthProtected>
            <LazyWrapper>
              <Favorites />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="bookings" element={
          <AuthProtected>
            <Bookings />
          </AuthProtected>
        } />
        
        <Route path="messages" element={
          <AuthProtected>
            <LazyWrapper>
              <MessagesPage />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="messages/:id" element={
          <AuthProtected>
            <LazyWrapper>
              <MessagesPage />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        {/* Redirect Legacy Message Routes to New One */}
        <Route path="messages/conversation/:conversationId" element={<Navigate to="/messages" replace />} />
        
        <Route path="networking" element={
          <AuthProtected>
            <LazyWrapper>
              <Networking />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="reviews" element={
          <AuthProtected>
            <LazyWrapper>
              <Reviews />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="notifications" element={
          <AuthProtected>
            <LazyWrapper>
              <Notifications />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="settings" element={
          <AuthProtected>
            <LazyWrapper>
              <Settings />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="settings/networking" element={
          <AuthProtected>
            <LazyWrapper>
              <NetworkingSettings />
            </LazyWrapper>
          </AuthProtected>
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
          <AuthProtected>
            <LazyWrapper>
              <MyDocumentsPage />
            </LazyWrapper>
          </AuthProtected>
        } />

        <Route path="host/become" element={
          <AuthProtected>
            <LazyWrapper>
              <BecomeHost />
            </LazyWrapper>
          </AuthProtected>
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
        <AuthProtected>
          <RoleProtected allowedRoles={['host']}>
            <MainLayout />
          </RoleProtected>
        </AuthProtected>
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
        <Route path="space/new" element={
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
            <AdminDashboard />
          </LazyWrapper>
        } />
        <Route path="users" element={
          <LazyWrapper>
            <AdminUsers />
          </LazyWrapper>
        } />
        <Route path="bookings" element={
          <LazyWrapper>
            <AdminBookings />
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
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
