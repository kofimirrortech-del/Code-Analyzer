import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const port = parseInt(process.env.PORT || '5173');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port,
    host: '0.0.0.0',
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 3000}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
