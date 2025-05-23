import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import AuthCallback from "./pages/AuthCallback";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";
import AuthProtected from "./components/auth/AuthProtected";
import Dashboard from "./pages/Dashboard";
import HostDashboard from "./pages/HostDashboard";
import SpacesManage from "./pages/SpacesManage";
import SpaceNew from "./pages/SpaceNew";
import SpaceEdit from "./pages/SpaceEdit";
import HostDashboardNew from "./pages/HostDashboardNew";
import Bookings from "./pages/Bookings";

// Create a client
const queryClient = new QueryClient();

const App = () => (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route 
                path="/onboarding" 
                element={
                  <AuthProtected requireOnboarding={false}>
                    <Onboarding />
                  </AuthProtected>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <AuthProtected>
                    <Dashboard />
                  </AuthProtected>
                }
              />
              <Route 
                path="/host/dashboard" 
                element={
                  <AuthProtected>
                    <HostDashboard />
                  </AuthProtected>
                }
              />
              <Route 
                path="/host/dashboard-new" 
                element={
                  <AuthProtected>
                    <HostDashboardNew />
                  </AuthProtected>
                }
              />
              <Route 
                path="/spaces/manage" 
                element={
                  <AuthProtected>
                    <SpacesManage />
                  </AuthProtected>
                }
              />
              <Route 
                path="/spaces/new" 
                element={
                  <AuthProtected>
                    <SpaceNew />
                  </AuthProtected>
                }
              />
              <Route 
                path="/spaces/:id/edit" 
                element={
                  <AuthProtected>
                    <SpaceEdit />
                  </AuthProtected>
                }
              />
              <Route 
                path="/favorites" 
                element={
                  <AuthProtected>
                    <Favorites />
                  </AuthProtected>
                }
              />
              <Route 
                path="/bookings" 
                element={
                  <AuthProtected>
                    <Bookings />
                  </AuthProtected>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

export default App;
