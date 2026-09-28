import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api to the OnionSure Express backend (port 4000).
// In production the backend serves this build from the same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': 'http://localhost:4000',
      // Uploaded inspection images are served by the backend static mount.
      '/uploads': 'http://localhost:4000',
      // WebSocket live-sync endpoint — proxied so the relative ws://host/ws
      // URL used by lib/realtime.ts resolves to the backend in dev too.
      '/ws': { target: 'ws://localhost:4000', ws: true },
      // Chatbot text API — proxied to Pipecat server (port 8765)
      // Only active when VITE_BOT_URL is not set to an external URL.
      // In production, set VITE_BOT_URL to the deployed chatbot server URL.
    },
  },
  define: {
    // Bot server URL — override with VITE_BOT_URL env var for production
    // Default: http://localhost:8765 (Pipecat chatbot server)
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (!id.includes('node_modules')) return undefined;
          if (id.match(/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|use-sync-external-store)[\\/]/)) return 'vendor-react';
          if (id.match(/[\\/]node_modules[\\/](recharts|d3-|victory|internmap|decimal\.js|lodash|tinycolor2|robust-predicates|delaunator)[\\/]/)) return 'vendor-charts';
          if (id.match(/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils|popmotion|framesync|style-value-types|@emotion)[\\/]/)) return 'vendor-motion';
          if (id.match(/[\\/]node_modules[\\/](lucide-react)[\\/]/)) return 'vendor-icons';
          if (id.match(/[\\/]node_modules[\\/](qrcode|qrcode\.react)[\\/]/)) return 'vendor-qr';
          return 'vendor';
        },
      },
    },
  },
});
