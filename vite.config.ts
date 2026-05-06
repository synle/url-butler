import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite config for URL Butler Chrome Extension.
 *
 * Builds multiple HTML entry points (popup, options, cycle) and
 * a separate background service worker. Output goes to dist/.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        cycle: resolve(__dirname, 'src/cycle/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Background script needs a predictable name for manifest.json
          if (chunkInfo.name === 'background') return 'background.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Don't minify for easier debugging during development
    minify: false,
    sourcemap: true,
  },
  // Resolve @ alias for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
