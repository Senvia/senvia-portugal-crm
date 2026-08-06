import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// Builds the two ES-module targets: the panel page (React) and the MV3 service
// worker. The content script is a separate IIFE build (vite.content.config.ts)
// because content scripts cannot be ES modules.
export default defineConfig({
  plugins: [react()],
  // Reuse the CRM's own .env so the extension always points at the same Supabase
  // project as the app — no duplicated URL/key to drift out of sync.
  envDir: '..',
  build: {
    // Readable stack traces: errors point at src/, not the minified bundle.
    sourcemap: true,
    // Extension pages load from disk; the polyfill only produces console noise.
    modulePreload: false,
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: 'panel.html',
        background: 'src/background.ts',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
