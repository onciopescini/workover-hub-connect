import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { analyzer } from "vite-bundle-analyzer";
import Inspect from "vite-plugin-inspect";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    // analyzer disabled in production to avoid interfering with chunk loading
    // mode === 'production' && analyzer(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    esbuild: {},
    rollupOptions: {
      output: {
        // Manual chunks for better caching and code splitting
        manualChunks: {
          // Core React vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // React Query (used across all pages)
          'vendor-query': ['@tanstack/react-query'],
          
          // Form libraries (heavy, used in specific pages)
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // UI library (Radix UI components)
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          
          // Admin panel bundle (lazy loaded only for admin users)
          'admin': [
            './src/pages/AdminPanel',
            './src/components/admin/AdminDashboard',
            './src/hooks/admin/useAdminDashboard',
            './src/hooks/admin/useAdminPrefetch',
            './src/hooks/admin/useRealtimeAdminData',
          ],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const ext = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: false,
  }
}));
