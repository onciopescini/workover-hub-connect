
import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import LoadingScreen from "@/components/LoadingScreen";

// Layouts
import { MainLayout } from "@/components/layout/MainLayout";
import { MarketplaceLayout } from "@/components/layout/MarketplaceLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Auth protection
import OptimizedAuthProtected from "@/components/auth/OptimizedAuthProtected";
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

// Host pages
const HostDashboard = lazy(() => import("@/pages/HostDashboard"));
const HostOnboarding = lazy(() => import("@/pages/HostOnboarding"));
const SpaceNew = lazy(() => import("@/pages/SpaceNew"));
const SpacesManage = lazy(() => import("@/pages/SpacesManage"));
const SpaceEdit = lazy(() => import("@/pages/SpaceEdit"));

// Admin pages
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminSpacesPage = lazy(() => import("@/pages/admin/AdminSpacesPage"));

// Wrapper per lazy loading
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingScreen />}>
    {children}
  </Suspense>
);

export const OptimizedAppRoutes = () => {
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

        {/* Protected routes */}
        <Route path="onboarding" element={
          <OptimizedAuthProtected requireOnboarding={false}>
            <LazyWrapper>
              <Onboarding />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="dashboard" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <Dashboard />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="profile" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <Profile />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="profile/edit" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <ProfileEdit />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="bookings" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <Bookings />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="messages" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <Messages />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="messages/:bookingId" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <MessageConversation />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="networking" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <Networking />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="networking-test-suite" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <NetworkingTestSuite />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="notifications" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <Notifications />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />
        
        <Route path="settings" element={
          <OptimizedAuthProtected>
            <LazyWrapper>
              <Settings />
            </LazyWrapper>
          </OptimizedAuthProtected>
        } />

        {/* Host-specific routes - AGGIUNTE QUI */}
        <Route path="space/new" element={
          <OptimizedAuthProtected>
            <RoleProtected allowedRoles={['host']}>
              <LazyWrapper>
                <SpaceNew />
              </LazyWrapper>
            </RoleProtected>
          </OptimizedAuthProtected>
        } />
        
        <Route path="spaces/manage" element={
          <OptimizedAuthProtected>
            <RoleProtected allowedRoles={['host']}>
              <LazyWrapper>
                <SpacesManage />
              </LazyWrapper>
            </RoleProtected>
          </OptimizedAuthProtected>
        } />
        
        <Route path="space/edit/:id" element={
          <OptimizedAuthProtected>
            <RoleProtected allowedRoles={['host']}>
              <LazyWrapper>
                <SpaceEdit />
              </LazyWrapper>
            </RoleProtected>
          </OptimizedAuthProtected>
        } />
      </Route>

      {/* Host routes */}
      <Route path="/host" element={
        <OptimizedAuthProtected>
          <RoleProtected allowedRoles={['host']}>
            <MainLayout />
          </RoleProtected>
        </OptimizedAuthProtected>
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
        <OptimizedAuthProtected>
          <RoleProtected allowedRoles={['admin']}>
            <AdminLayout currentPage="/admin">
              <div />
            </AdminLayout>
          </RoleProtected>
        </OptimizedAuthProtected>
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
