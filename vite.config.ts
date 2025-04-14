import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'leaflet-vendor': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
  base: '/Tracker_Tartufi-FunghiRepository002/',
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});
