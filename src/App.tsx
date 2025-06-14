import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { default as ProtectedRoute } from '@/components/auth/AuthProtected';

// Public pages
import LandingPage from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Spaces from '@/pages/PublicSpaces';
import SpaceDetail from '@/pages/SpaceDetail';
import Events from '@/pages/PublicEvents';
import EventDetail from '@/pages/EventDetail';
import AuthCallback from '@/pages/AuthCallback';

// Protected pages
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import UserProfile from '@/pages/UserProfile';
import Bookings from '@/pages/Bookings';
import Messages from '@/pages/Messages';
import NetworkingAdvanced from '@/pages/NetworkingAdvanced';
import NetworkingDiscover from '@/pages/NetworkingDiscover';
import PrivateChats from '@/pages/PrivateChats';
import Privacy from '@/pages/Privacy';
import PrivacyExportRequest from '@/pages/PrivacyExportRequest';
import PrivacyDeletionRequest from '@/pages/PrivacyDeletionRequest';
import StripeValidationTestPage from '@/pages/StripeValidationTestPage';

// Host pages
import HostDashboard from '@/pages/HostDashboard';
import HostSpaceManagement from '@/pages/SpacesManage';
import CreateSpace from '@/pages/SpaceNew';
import EditSpace from '@/pages/SpaceEdit';
import HostRevenue from '@/pages/host/HostRevenue';
import HostEvents from '@/pages/host/HostEvents';
import CreateEvent from '@/pages/host/HostEventNew';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboardPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminLogsPage from '@/pages/admin/AdminLogsPage';
import AdminGDPRPage from '@/pages/admin/AdminGDPRPage';
import AdminPanel from '@/pages/AdminPanel';

// Validation pages
import ValidationDashboard from '@/pages/ValidationDashboard';
import RegressionValidation from '@/pages/RegressionValidation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public routes with PUBLIC LAYOUT */}
            <Route
              element={<PublicLayout />}
            >
              <Route path="/" element={<LandingPage />} />
              <Route path="/spaces" element={<Spaces />} />
              <Route path="/spaces/:id" element={<SpaceDetail />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
            </Route>

            {/* Auth pages (outside layouts, so they don't get main nav/footers) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected routes with MAIN LAYOUT */}
            <Route
              element={<MainLayout />}
            >
              {/* Inserire qui tutte le route protette */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user/:userId"
                element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <Bookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/networking"
                element={
                  <ProtectedRoute>
                    <NetworkingAdvanced />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/networking-discover"
                element={
                  <ProtectedRoute>
                    <NetworkingDiscover />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/private-chats"
                element={
                  <ProtectedRoute>
                    <PrivateChats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/private-chats/:chatId"
                element={
                  <ProtectedRoute>
                    <PrivateChats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/privacy"
                element={
                  <ProtectedRoute>
                    <Privacy />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/privacy/export-request"
                element={
                  <ProtectedRoute>
                    <PrivacyExportRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/privacy/deletion-request"
                element={
                  <ProtectedRoute>
                    <PrivacyDeletionRequest />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/regression-validation"
                element={
                  <ProtectedRoute>
                    <RegressionValidation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stripe-validation"
                element={
                  <ProtectedRoute>
                    <StripeValidationTestPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/validation"
                element={
                  <ProtectedRoute>
                    <ValidationDashboard />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Host routes */}
            <Route
              path="/host"
              element={
                <ProtectedRoute>
                  <HostDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/spaces"
              element={
                <ProtectedRoute>
                  <HostSpaceManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/spaces/new"
              element={
                <ProtectedRoute>
                  <CreateSpace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/spaces/:id/edit"
              element={
                <ProtectedRoute>
                  <EditSpace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/revenue"
              element={
                <ProtectedRoute>
                  <HostRevenue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/events"
              element={
                <ProtectedRoute>
                  <HostEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/events/new"
              element={
                <ProtectedRoute>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <ProtectedRoute>
                  <AdminLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/gdpr"
              element={
                <ProtectedRoute>
                  <AdminGDPRPage />
                </ProtectedRoute>
              }
            />

            {/* Legacy redirect */}
            <Route path="/admin-panel" element={<AdminPanel />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
