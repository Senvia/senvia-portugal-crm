import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// PWA plugin removed intentionally — was causing stale shells (cached old
// builds prevented users from receiving new features like the Importar button).
// Installability is preserved via static /manifest.webmanifest + /sw.js
// kill-switch in /public.
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core — tiny but loaded first
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/scheduler/")) {
            return "vendor-react";
          }
          // React Router
          if (id.includes("node_modules/react-router") || id.includes("node_modules/@remix-run/")) {
            return "vendor-router";
          }
          // TanStack (React Query + Virtual)
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }
          // Supabase
          if (id.includes("node_modules/@supabase/") || id.includes("node_modules/postgres-js/")) {
            return "vendor-supabase";
          }
          // Radix UI primitives (heavy — split from the rest)
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          // Framer Motion
          if (id.includes("node_modules/framer-motion/")) {
            return "vendor-motion";
          }
          // Forms (react-hook-form + zod + resolvers)
          if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/zod") || id.includes("node_modules/@hookform/")) {
            return "vendor-forms";
          }
          // Lucide icons
          if (id.includes("node_modules/lucide-react/")) {
            return "vendor-icons";
          }
        },
      },
    },
  },
}));
