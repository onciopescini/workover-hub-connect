
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
import { PerformanceBudget } from "@/components/performance/PerformanceBudget";
import { RoutePreloader } from "@/components/routing/RoutePreloader";
import { OrganizationSchema, WebsiteSchema } from "@/components/seo/StructuredData";

import "./App.css";
import { TIME_CONSTANTS, BUSINESS_RULES } from "@/constants";

// Configurazione ottimizzata QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: TIME_CONSTANTS.STALE_TIME,
      gcTime: TIME_CONSTANTS.CACHE_DURATION * 2,
      retry: BUSINESS_RULES.RETRY_ATTEMPTS - 2, // 1 retry
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: BUSINESS_RULES.RETRY_ATTEMPTS - 2, // 1 retry
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
                      <PerformanceBudget />
                      <RoutePreloader />
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
