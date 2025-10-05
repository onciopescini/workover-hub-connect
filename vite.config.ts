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
    // mode === 'development' && Inspect(), // Disabled to fix Vite crash
    mode === 'production' && analyzer(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }
          
          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'react-query';
          }
          
          // Supabase
          if (id.includes('@supabase/supabase-js') || id.includes('@supabase/')) {
            return 'supabase';
          }
          
          // Radix UI components (split by component)
          if (id.includes('@radix-ui')) {
            const component = id.match(/@radix-ui\/react-([^/]+)/)?.[1];
            return component ? `radix-${component}` : 'radix-ui';
          }
          
          // Date libraries
          if (id.includes('date-fns')) {
            return 'date-utils';
          }
          
          // Charts
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts';
          }
          
          // Map libraries
          if (id.includes('mapbox-gl')) {
            return 'maps';
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('@hookform')) {
            return 'forms';
          }
          
          // Icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Animation
          if (id.includes('framer-motion')) {
            return 'animations';
          }
          
          // Validation
          if (id.includes('zod')) {
            return 'validation';
          }
          
          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
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
