
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { GDPRProvider } from "@/components/gdpr/GDPRProvider";
import { AppRoutes } from "@/components/routing/AppRoutes";
import { ProductionMonitoring } from "@/components/shared/ProductionMonitoring";

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
            <AuthProvider>
              <GDPRProvider>
                <AppRoutes />
              </GDPRProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ProductionMonitoring>
  );
}

export default App;
