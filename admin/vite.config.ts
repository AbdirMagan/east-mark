import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 5175 keeps the dashboard clear of the marketplace on 5173/5174.
    port: 5175,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
