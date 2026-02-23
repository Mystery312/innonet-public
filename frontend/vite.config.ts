import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Build optimizations for production
  build: {
    // Generate source maps for error tracking (Sentry)
    sourcemap: true,

    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - these change less frequently
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['axios', '@tanstack/react-query'],
          'vendor-graph': ['d3'],
        },
      },
    },

    // Target modern browsers for smaller bundles
    target: 'es2020',

    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 1000,
  },

  // Preview server for testing production builds locally
  preview: {
    port: 4173,
    host: true,
  },

  // Development server configuration
  server: {
    port: 5173,
    host: true,
    // Proxy API requests in development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
