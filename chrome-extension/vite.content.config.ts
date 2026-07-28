import { defineConfig } from 'vite';

// Content scripts must be classic scripts, not ES modules — Chrome refuses to
// inject a file with `import`/`export`. Lib mode + IIFE bundles every dependency
// inline into a single self-contained file.
// `emptyOutDir: false` so this build doesn't wipe the panel/background output.
export default defineConfig({
  envDir: '..',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/content.ts',
      name: 'SenviaContent',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
});
