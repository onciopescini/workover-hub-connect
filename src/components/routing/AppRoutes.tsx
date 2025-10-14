
import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import QAValidationDashboard from "@/components/qa/QAValidationDashboard";

// Layouts
import { MainLayout } from "@/components/layout/MainLayout";
import { MarketplaceLayout } from "@/components/layout/MarketplaceLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Auth protection
import AuthProtected from "@/components/auth/AuthProtected";
import RoleProtected from "@/components/auth/RoleProtected";
import { ModeratorRoute } from "@/components/admin/ModeratorRoute";

// Public pages (eager loading per performance)
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import PublicSpaces from "@/pages/PublicSpaces";
import About from "@/pages/About";
import FAQ from "@/pages/FAQ";
import Contact from "@/pages/Contact";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/NotFound";

// Lazy loading per pagine non critiche
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Profile = lazy(() => import("@/pages/Profile"));
const ProfileEdit = lazy(() => import("@/pages/ProfileEdit"));
const UserProfileView = lazy(() => import("@/pages/UserProfileView"));
import Bookings from "@/pages/Bookings";
const ModernMessages = lazy(() => import("@/pages/ModernMessages"));
const MessageConversation = lazy(() => import("@/pages/MessageConversation"));
const ChatThread = lazy(() => import("@/pages/ChatThread"));
const PrivateChats = lazy(() => import("@/pages/PrivateChats"));
const Networking = lazy(() => import("@/pages/NetworkingAdvanced"));
const NetworkingTestSuite = lazy(() => import("@/pages/NetworkingTestSuite"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Settings = lazy(() => import("@/pages/Settings"));
const NetworkingSettings = lazy(() => import("@/pages/NetworkingSettings"));
const SpaceDetail = lazy(() => import("@/pages/SpaceDetail"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const StrictModeFixer = lazy(() => import("@/pages/StrictModeFixer"));

// Host pages
const HostDashboard = lazy(() => import("@/pages/HostDashboard"));
const StripeReturn = lazy(() => import("@/pages/host/StripeReturn"));
const HostOnboarding = lazy(() => import("@/pages/HostOnboarding"));
const SpaceNew = lazy(() => import("@/pages/SpaceNew"));
const SpacesManage = lazy(() => import("@/pages/SpacesManage"));
const SpaceEdit = lazy(() => import("@/pages/SpaceEdit"));
const SpaceRecap = lazy(() => import("@/pages/SpaceRecap"));
const HostCalendar = lazy(() => import("@/pages/host/HostCalendar"));
const HostFiscalPage = lazy(() => import("@/pages/host/HostFiscalPage"));

// Admin pages
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminSpacesPage = lazy(() => import("@/pages/admin/AdminSpacesPage"));
const AdminTagsPage = lazy(() => import("@/pages/admin/AdminTagsPage"));
const AdminReportsPage = lazy(() => import("@/pages/admin/AdminReportsPage"));
const AdminTicketsPage = lazy(() => import("@/pages/admin/AdminTicketsPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminLogsPage = lazy(() => import("@/pages/admin/AdminLogsPage"));
const AdminMonitoringPage = lazy(() => import("@/pages/admin/AdminMonitoringPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/AdminSettingsPage"));
const AdminGDPRPage = lazy(() => import("@/pages/admin/AdminGDPRPage"));
const AdminFiscalPage = lazy(() => import("@/pages/admin/AdminFiscalPage"));
const SystemRoles = lazy(() => import("@/pages/admin/SystemRoles"));
const UnauthorizedPage = lazy(() => import("@/pages/admin/UnauthorizedPage"));
const PrivacyExportRequest = lazy(() => import("@/pages/PrivacyExportRequest"));
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
        <Route path="spaces" element={<PublicSpaces />} />
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
        <Route path="privacy/export-request" element={
          <AuthProtected>
            <LazyWrapper>
              <PrivacyExportRequest />
            </LazyWrapper>
          </AuthProtected>
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
        
        <Route path="bookings" element={
          <AuthProtected>
            <Bookings />
          </AuthProtected>
        } />
        
        <Route path="messages" element={
          <AuthProtected>
            <LazyWrapper>
              <ModernMessages />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="messages/conversation/:conversationId" element={
          <AuthProtected>
            <LazyWrapper>
              <ChatThread />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="messages/:bookingId" element={
          <AuthProtected>
            <LazyWrapper>
              <MessageConversation />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="private-chats" element={
          <AuthProtected>
            <LazyWrapper>
              <PrivateChats />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="private-chats/:chatId" element={
          <AuthProtected>
            <LazyWrapper>
              <PrivateChats />
            </LazyWrapper>
          </AuthProtected>
        } />
        
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
        
        <Route path="networking-test-suite" element={
          <AuthProtected>
            <LazyWrapper>
              <NetworkingTestSuite />
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

        {/* TypeScript Strict Mode Fixer - public tool */}
        <Route path="strict-mode-fixer" element={
          <LazyWrapper>
            <StrictModeFixer />
          </LazyWrapper>
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
        <Route path="onboarding" element={
          <LazyWrapper>
            <HostOnboarding />
          </LazyWrapper>
        } />
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
        <Route path="fiscal" element={
          <LazyWrapper>
            <HostFiscalPage />
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

      {/* Admin routes - Protected with ModeratorRoute */}
      <Route path="/admin" element={
        <AuthProtected>
          <ModeratorRoute>
            <AdminLayout />
          </ModeratorRoute>
        </AuthProtected>
      }>
        {/* Dashboard - accessible to both admin and moderator */}
        <Route index element={
          <LazyWrapper>
            <AdminPanel />
          </LazyWrapper>
        } />
        
        {/* Admin-only routes */}
        <Route path="users" element={
          <ModeratorRoute requireAdmin={true}>
            <LazyWrapper>
              <AdminUsersPage />
            </LazyWrapper>
          </ModeratorRoute>
        } />
        
        <Route path="system-roles" element={
          <ModeratorRoute requireAdmin={true}>
            <LazyWrapper>
              <SystemRoles />
            </LazyWrapper>
          </ModeratorRoute>
        } />
        
        <Route path="settings" element={
          <ModeratorRoute requireAdmin={true}>
            <LazyWrapper>
              <AdminSettingsPage />
            </LazyWrapper>
          </ModeratorRoute>
        } />
        
        <Route path="gdpr" element={
          <ModeratorRoute requireAdmin={true}>
            <LazyWrapper>
              <AdminGDPRPage />
            </LazyWrapper>
          </ModeratorRoute>
        } />
        
        {/* Moderator + Admin routes */}
        <Route path="spaces" element={
          <LazyWrapper>
            <AdminSpacesPage />
          </LazyWrapper>
        } />
        
        <Route path="tags" element={
          <LazyWrapper>
            <AdminTagsPage />
          </LazyWrapper>
        } />
        
        <Route path="reports" element={
          <LazyWrapper>
            <AdminReportsPage />
          </LazyWrapper>
        } />
        
        <Route path="tickets" element={
          <LazyWrapper>
            <AdminTicketsPage />
          </LazyWrapper>
        } />
        
        <Route path="logs" element={
          <LazyWrapper>
            <AdminLogsPage />
          </LazyWrapper>
        } />
        
        <Route path="monitoring" element={
          <LazyWrapper>
            <AdminMonitoringPage />
          </LazyWrapper>
        } />
        
        <Route path="analytics" element={
          <LazyWrapper>
            <AdminAnalyticsPage />
          </LazyWrapper>
        } />
        
        <Route path="fiscal" element={
          <ModeratorRoute requireAdmin={true}>
            <LazyWrapper>
              <AdminFiscalPage />
            </LazyWrapper>
          </ModeratorRoute>
        } />
      </Route>

      {/* Unauthorized access page */}
      <Route path="/unauthorized" element={
        <LazyWrapper>
          <UnauthorizedPage />
        </LazyWrapper>
      } />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
