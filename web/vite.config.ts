import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    allowedHosts: ['mulberry-strongbox-kosher.ngrok-free.dev'],
    proxy: {
      // Talk to the local API in development without CORS ceremony.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // To the browser /api is same-origin, so CORS has nothing to protect
        // here. Browsers still attach Origin to POSTs, though, and when the dev
        // server is opened through ngrok, a LAN IP or 127.0.0.1 the backend's
        // CORS_ORIGINS allowlist refuses it ("This origin is not allowed") --
        // reads work, every write fails. Drop the header at the proxy.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
  build: {
    target: 'es2020',
    // Listings are browsed on 2G/3G. Splitting the vendor libraries out means
    // a return visitor re-downloads only the app chunk, not React again.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          auth: ['@supabase/auth-js'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
