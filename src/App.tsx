
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import AuthProtected from './components/auth/AuthProtected';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import HostDashboard from './pages/HostDashboard';
import Bookings from './pages/Bookings';
import Favorites from './pages/Favorites';
import Reviews from './pages/Reviews';
import Messages from './pages/Messages';
import MessageConversation from './pages/MessageConversation';
import SpaceNew from './pages/SpaceNew';
import SpacesManage from './pages/SpacesManage';
import SpaceEdit from './pages/SpaceEdit';
import EventDetail from './pages/EventDetail';
import NotFound from './pages/NotFound';
import HostDashboardNew from './pages/HostDashboardNew';
import Support from './pages/Support';
import { Toaster } from "@/components/ui/sonner"

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
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Protected Routes */}
              <Route path="/onboarding" element={
                <AuthProtected>
                  <Onboarding />
                </AuthProtected>
              } />
              <Route path="/dashboard" element={
                <AuthProtected>
                  <Dashboard />
                </AuthProtected>
              } />
              <Route path="/host-dashboard" element={
                <AuthProtected>
                  <HostDashboard />
                </AuthProtected>
              } />
              <Route path="/host-dashboard-new" element={
                <AuthProtected>
                  <HostDashboardNew />
                </AuthProtected>
              } />
              <Route path="/bookings" element={
                <AuthProtected>
                  <Bookings />
                </AuthProtected>
              } />
              <Route path="/favorites" element={
                <AuthProtected>
                  <Favorites />
                </AuthProtected>
              } />
              <Route path="/reviews" element={
                <AuthProtected>
                  <Reviews />
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
                  <SpaceNew />
                </AuthProtected>
              } />
              <Route path="/spaces/manage" element={
                <AuthProtected>
                  <SpacesManage />
                </AuthProtected>
              } />
              <Route path="/spaces/:id/edit" element={
                <AuthProtected>
                  <SpaceEdit />
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
