
import { Routes, Route } from "react-router-dom";
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

// Public pages (eager loading per performance)
import Index from "@/pages/Index";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import PublicSpaces from "@/pages/PublicSpaces";
import PublicEvents from "@/pages/PublicEvents";
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
const Bookings = lazy(() => import("@/pages/Bookings"));
const Messages = lazy(() => import("@/pages/Messages"));
const MessageConversation = lazy(() => import("@/pages/MessageConversation"));
const Networking = lazy(() => import("@/pages/NetworkingAdvanced"));
const NetworkingTestSuite = lazy(() => import("@/pages/NetworkingTestSuite"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Settings = lazy(() => import("@/pages/Settings"));
const SpaceDetail = lazy(() => import("@/pages/SpaceDetail"));
const EventDetail = lazy(() => import("@/pages/EventDetail"));
const StrictModeFixer = lazy(() => import("@/pages/StrictModeFixer"));

// Host pages
const HostDashboard = lazy(() => import("@/pages/HostDashboard"));
const HostOnboarding = lazy(() => import("@/pages/HostOnboarding"));
const SpaceNew = lazy(() => import("@/pages/SpaceNew"));
const SpacesManage = lazy(() => import("@/pages/SpacesManage"));
const SpaceEdit = lazy(() => import("@/pages/SpaceEdit"));
const SpaceRecap = lazy(() => import("@/pages/SpaceRecap"));

// Admin pages
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminSpacesPage = lazy(() => import("@/pages/admin/AdminSpacesPage"));
const PrivacyExportRequest = lazy(() => import("@/pages/PrivacyExportRequest"));

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
        <Route path="events" element={<PublicEvents />} />
        <Route path="events/:id" element={
          <LazyWrapper>
            <EventDetail />
          </LazyWrapper>
        } />
        
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
            <LazyWrapper>
              <Bookings />
            </LazyWrapper>
          </AuthProtected>
        } />
        
        <Route path="messages" element={
          <AuthProtected>
            <LazyWrapper>
              <Messages />
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
        
        <Route path="networking" element={
          <AuthProtected>
            <LazyWrapper>
              <Networking />
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

      {/* Admin routes */}
      <Route path="/admin" element={
        <AuthProtected>
          <RoleProtected allowedRoles={['admin']}>
            <AdminLayout currentPage="/admin">
              <div />
            </AdminLayout>
          </RoleProtected>
        </AuthProtected>
      }>
        <Route index element={
          <LazyWrapper>
            <AdminPanel />
          </LazyWrapper>
        } />
        <Route path="users" element={
          <LazyWrapper>
            <AdminUsersPage />
          </LazyWrapper>
        } />
        <Route path="spaces" element={
          <LazyWrapper>
            <AdminSpacesPage />
          </LazyWrapper>
        } />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
