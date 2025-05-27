
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import AuthProtected from './components/auth/AuthProtected';
import RoleProtected from './components/auth/RoleProtected';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import HostDashboard from './pages/HostDashboard';
import Profile from './pages/Profile';
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
import AdminPanel from './pages/AdminPanel';
import { Toaster } from "@/components/ui/sonner"
import PublicSpaces from './pages/PublicSpaces';
import PublicEvents from './pages/PublicEvents';

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Index />} />
              
              {/* Public marketplace routes */}
              <Route path="/spaces" element={<PublicSpaces />} />
              <Route path="/spaces/:id" element={<SpaceDetail />} />
              <Route path="/events" element={<PublicEvents />} />
              
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Onboarding route - requires auth but NOT completed onboarding */}
              <Route path="/onboarding" element={
                <AuthProtected requireOnboarding={false}>
                  <Onboarding />
                </AuthProtected>
              } />
              
              {/* Protected Routes - require completed onboarding */}
              <Route path="/dashboard" element={
                <AuthProtected>
                  <Dashboard />
                </AuthProtected>
              } />
              <Route path="/profile" element={
                <AuthProtected>
                  <Profile />
                </AuthProtected>
              } />
              <Route path="/host/dashboard" element={
                <AuthProtected>
                  <RoleProtected allowedRoles={["host"]}>
                    <HostDashboard />
                  </RoleProtected>
                </AuthProtected>
              } />
              <Route path="/admin" element={
                <AuthProtected>
                  <RoleProtected allowedRoles={["admin"]}>
                    <AdminPanel />
                  </RoleProtected>
                </AuthProtected>
              } />
              <Route path="/bookings" element={
                <AuthProtected>
                  <Bookings />
                </AuthProtected>
              } />
              <Route path="/favorites" element={
                <AuthProtected>
                  <RoleProtected allowedRoles={["coworker"]}>
                    <Favorites />
                  </RoleProtected>
                </AuthProtected>
              } />
              <Route path="/reviews" element={
                <AuthProtected>
                  <Reviews />
                </AuthProtected>
              } />
              <Route path="/bidirectional-reviews" element={
                <AuthProtected>
                  <BidirectionalReviews />
                </AuthProtected>
              } />
              <Route path="/messages" element={
                <AuthProtected>
                  <Messages />
                </AuthProtected>
              } />
              <Route path="/messages/:bookingId" element={
                <AuthProtected>
                  <MessageConversation />
                </AuthProtected>
              } />
              <Route path="/spaces/new" element={
                <AuthProtected>
                  <RoleProtected allowedRoles={["host"]}>
                    <SpaceNew />
                  </RoleProtected>
                </AuthProtected>
              } />
              <Route path="/spaces/manage" element={
                <AuthProtected>
                  <RoleProtected allowedRoles={["host"]}>
                    <SpacesManage />
                  </RoleProtected>
                </AuthProtected>
              } />
              <Route path="/spaces/:id/edit" element={
                <AuthProtected>
                  <RoleProtected allowedRoles={["host"]}>
                    <SpaceEdit />
                  </RoleProtected>
                </AuthProtected>
              } />
              <Route path="/events/:id" element={
                <AuthProtected>
                  <EventDetail />
                </AuthProtected>
              } />
              <Route path="/support" element={
                <AuthProtected>
                  <Support />
                </AuthProtected>
              } />
              {/* Networking - Solo per coworker */}
              <Route path="/networking" element={
                <AuthProtected>
                  <RoleProtected allowedRoles={["coworker"]}>
                    <Networking />
                  </RoleProtected>
                </AuthProtected>
              } />
              <Route path="/networking/discover" element={
                <AuthProtected>
                  <RoleProtected allowedRoles={["coworker"]}>
                    <NetworkingDiscover />
                  </RoleProtected>
                </AuthProtected>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
