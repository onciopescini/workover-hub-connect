import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from "@/providers/AuthProvider";
import { GDPRProvider } from "@/components/gdpr/GDPRProvider";
import { CSPProvider } from "@/components/security/CSPProvider";
import { SecurityHeadersProvider } from "@/components/security/SecurityHeadersProvider";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { AppRoutes } from "@/components/routing/AppRoutes";
import { ProductionMonitoring } from "@/components/shared/ProductionMonitoring";
import { PerformanceMonitor } from "@/components/performance/PerformanceMonitor";
import { PerformanceBudget } from "@/components/performance/PerformanceBudget";
import { RoutePreloader } from "@/components/routing/RoutePreloader";
import { OrganizationSchema, WebsiteSchema } from "@/components/seo/StructuredData";
import { optimizedQueryClient } from "@/lib/react-query-config";
import { FiscalModeProvider } from "@/contexts/FiscalModeContext";
import { FiscalModeIndicator } from "@/components/fiscal/FiscalModeIndicator";
import { MapboxTokenProvider } from "@/contexts/MapboxTokenContext";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import UIThemeProvider from "@/providers/UIThemeProvider";

import "./App.css";
import { initSentry } from "@/lib/sentry-config";

// Inizializza Sentry
initSentry();

function App() {
  return (
    <UIThemeProvider>
      <SecurityHeadersProvider>
        <HelmetProvider>
          <CSPProvider>
          <ProductionMonitoring>
            <QueryClientProvider client={optimizedQueryClient}>
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
                    <MapboxTokenProvider>
                      <FiscalModeProvider>
                        <GDPRProvider>
                          <ErrorBoundary showDetails={import.meta.env.MODE === 'development'}>
                            <PerformanceMonitor />
                            <PerformanceBudget />
                            <RoutePreloader />
            <OrganizationSchema />
            <WebsiteSchema />
            <FiscalModeIndicator />
            <ServiceWorkerRegistration />
            <AppRoutes />
                          </ErrorBoundary>
                        </GDPRProvider>
                      </FiscalModeProvider>
                    </MapboxTokenProvider>
                  </AuthProvider>
                </AnalyticsProvider>
              </BrowserRouter>
            </TooltipProvider>
            </QueryClientProvider>
          </ProductionMonitoring>
          </CSPProvider>
        </HelmetProvider>
      </SecurityHeadersProvider>
    </UIThemeProvider>
  );
}

export default App;
