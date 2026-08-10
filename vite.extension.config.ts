import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

/**
 * Builds the REAL CRM into the Chrome extension, as `crm-app.html`.
 *
 * Why it lives here and not in chrome-extension/: the app pulls in 70+ packages,
 * Tailwind, shadcn and the `@/` alias. Building it from the CRM's own project
 * means all of that already works — the alternative was duplicating the entire
 * dependency tree in a second package.json and keeping the two in step forever.
 *
 * The extension's own build (chrome-extension/vite.config.ts) still handles the
 * content script, service worker and contact panel. This one only adds the CRM
 * page to the same dist/, hence `emptyOutDir: false`.
 *
 * `base: './'` is essential: assets must resolve relative to the extension page,
 * not to a server root that doesn't exist under chrome-extension://.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    /**
     * Force a single copy of every library that keeps module-level state.
     *
     * The entry file lives under chrome-extension/, which has its own
     * node_modules (the panel and content script are built from there). Node
     * resolution walks UP from the importing file, so `main.tsx` was getting
     * chrome-extension/node_modules/react while `@/App` — resolved from the CRM
     * root — got the root copy. Two Reacts means one instance's hook dispatcher
     * is null while the other renders, which surfaces as the misleading
     * "Cannot read properties of null (reading 'useState')".
     *
     * dedupe pins these to the root project, where the app's own tree lives.
     */
    dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
  base: './',
  build: {
    outDir: 'chrome-extension/dist',
    emptyOutDir: false,
    sourcemap: true,
    // Extension pages load from disk; the preload polyfill only adds console noise.
    modulePreload: false,
    rollupOptions: {
      input: { 'crm-app': path.resolve(__dirname, 'crm-app.html') },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
