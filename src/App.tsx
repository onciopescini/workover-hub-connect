
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/providers/AuthProvider";
import { GDPRProvider } from "@/components/gdpr/GDPRProvider";
import { CSPProvider } from "@/components/security/CSPProvider";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { AppRoutes } from "@/components/routing/AppRoutes";
import { ProductionMonitoring } from "@/components/shared/ProductionMonitoring";
import { PerformanceMonitor } from "@/components/performance/PerformanceMonitor";
import { OrganizationSchema, WebsiteSchema } from "@/components/seo/StructuredData";

import "./App.css";

// Configurazione ottimizzata QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minuti
      gcTime: 10 * 60 * 1000, // 10 minuti
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <HelmetProvider>
      <CSPProvider>
        <ProductionMonitoring>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                }}
              />
              <BrowserRouter>
                <AnalyticsProvider>
                  <AuthProvider>
                    <GDPRProvider>
                      <PerformanceMonitor />
                      <OrganizationSchema />
                      <WebsiteSchema />
                      <AppRoutes />
                    </GDPRProvider>
                  </AuthProvider>
                </AnalyticsProvider>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </ProductionMonitoring>
      </CSPProvider>
    </HelmetProvider>
  );
}

export default App;
